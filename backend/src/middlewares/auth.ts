import { createMiddleware } from 'hono/factory'
import { auth } from 'utils/auth'
import { db } from 'config/db'
import { log } from 'utils/logger'
import { APP_ROLE_HEADER, CLIENT_ROLE, NO_ROLE, PSYCHO_ROLE } from '../constants'
import type { MiddlewareVariable, User } from 'utils/types'

export const setSession = createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
        c.set('user', null)
        c.set('session', null)
    } else {
        c.set('user', session.user)
        c.set('session', session.session)
    }
    await next()
})

export const authorized = createMiddleware<MiddlewareVariable<'user', User>>(async (c, next) => {
    const user = c.get('user')
    const session = c.get('session')

    if (!user || !session) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    await next()
})

/**
 * Validates the role header against the user's actual active_role in the DB.
 * Rejects with 403 if the header claims a role that doesn't match the stored role.
 * Allows no-role (roleless) requests through — those are handled by onlyPsychoRequest/onlyClientRequest.
 */
export const setUserRole = createMiddleware(async (c, next) => {
    const role = c.req.header(APP_ROLE_HEADER)

    if (role === CLIENT_ROLE) {
        c.set('role', CLIENT_ROLE)
    } else if (role === PSYCHO_ROLE) {
        c.set('role', PSYCHO_ROLE)
    } else if (!role) {
        c.set('role', NO_ROLE)
    } else {
        return c.json({ error: 'Invalid role' }, 400)
    }

    // Validate claimed role against DB for authenticated users
    const user = c.get('user')
    if (user && role) {
        const [row] = await db`SELECT active_role FROM "user" WHERE id = ${user.id}`
        if (row?.active_role && row.active_role !== role) {
            return c.json(
                { error: 'Forbidden', message: 'Role header does not match your active role.' },
                403,
            )
        }
    }

    await next()
})

export const onlyPsychoRequest = createMiddleware(async (c, next) => {
    const role = c.get('role')

    if (role === undefined) {
        log.warn('[Middleware] role is undefined — setUserRole likely not mounted', {
            path: c.req.path,
        })
        return c.json({ error: 'ServerMisconfigured' }, 500)
    }

    if (role !== PSYCHO_ROLE) {
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Only a psychologist can make this request',
            },
            403,
        )
    }

    await next()
})

export const onlyClientRequest = createMiddleware(async (c, next) => {
    const role = c.get('role')

    if (role === undefined) {
        log.warn('[Middleware] role is undefined — setUserRole likely not mounted', {
            path: c.req.path,
        })
        return c.json({ error: 'ServerMisconfigured' }, 500)
    }

    if (role !== CLIENT_ROLE) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    await next()
})

/**
 * Verifies the authenticated psychologist is linked to the :clientId in the URL path.
 * Must be used after `authorized` and `onlyPsychoRequest`.
 */
export const onlyLinkedClient = createMiddleware(async (c, next) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')

    if (!clientId) {
        return c.json({ error: 'BadRequest', message: 'clientId is required' }, 400)
    }

    const [row] =
        await db`SELECT 1 FROM psychologist_clients WHERE client_id = ${clientId} AND psycho_id = ${user.id} AND disconnected_at IS NULL`

    if (!row) {
        return c.json({ error: 'NotFound' }, 404)
    }

    await next()
})

/**
 * Verifies all file IDs in the request body (imageFileIds, audioFileIds) were uploaded by the current user.
 * Must be used after `authorized`.
 */
export const ownsFiles = createMiddleware(async (c, next) => {
    const user = c.get('user')

    let body: Record<string, unknown>
    try {
        body = await c.req.json()
    } catch {
        await next()
        return
    }

    const fileIds: string[] = []
    if (Array.isArray(body.imageFileIds)) {
        fileIds.push(...body.imageFileIds)
    }
    if (Array.isArray(body.audioFileIds)) {
        fileIds.push(...body.audioFileIds)
    }

    if (fileIds.length === 0) {
        await next()
        return
    }

    const rows = await db`
        SELECT id FROM files
        WHERE id IN ${db(fileIds)}
          AND uploaded_by != ${user.id}
    `

    if (rows.length > 0) {
        return c.json({ error: 'Forbidden', message: 'You do not own all referenced files.' }, 403)
    }

    await next()
})
