import { createMiddleware } from 'hono/factory'
import { auth } from 'utils/auth'
import { log } from 'utils/logger'
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from 'errors/index'
import { ClientsRepo } from '../features/clients/repo'
import { FilesRepo } from '../features/files/repo'
import { UsersRepo } from '../features/users/repo'
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
        throw new UnauthorizedError()
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
        throw new BadRequestError('Invalid role', 'InvalidRole')
    }

    const user = c.get('user')
    if (user && role) {
        const dbUser = await UsersRepo.findById(user.id)
        if (dbUser?.activeRole && dbUser.activeRole !== role) {
            throw new ForbiddenError('Role header does not match your active role.', 'RoleMismatch')
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
        throw new Error('Server misconfigured: setUserRole is not mounted')
    }

    if (role !== PSYCHO_ROLE) {
        throw new ForbiddenError('Only a psychologist can make this request')
    }

    await next()
})

export const onlyClientRequest = createMiddleware(async (c, next) => {
    const role = c.get('role')

    if (role === undefined) {
        log.warn('[Middleware] role is undefined — setUserRole likely not mounted', {
            path: c.req.path,
        })
        throw new Error('Server misconfigured: setUserRole is not mounted')
    }

    if (role !== CLIENT_ROLE) {
        throw new ForbiddenError('Only a client can make this request')
    }

    await next()
})

/**
 * Verifies the authenticated psychologist is linked to the :clientId in the URL path.
 * Must be used after `authorized` and `onlyPsychoRequest`.
 */
export const onlyLinkedClient = createMiddleware<MiddlewareVariable<'user', User>>(
    async (c, next) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')

        if (!clientId) {
            throw new BadRequestError('clientId is required')
        }

        const linked = await ClientsRepo.isLinkedToPsycho(clientId, user.id)

        if (!linked) {
            throw new NotFoundError()
        }

        await next()
    },
)

/**
 * Verifies all file IDs in the request body (imageFileIds, audioFileIds) were uploaded by the current user.
 * Must be used after `authorized`.
 */
export const ownsFiles = createMiddleware<MiddlewareVariable<'user', User>>(async (c, next) => {
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

    const unowned = await FilesRepo.findIdsNotOwnedBy(fileIds, user.id)

    if (unowned.length > 0) {
        throw new ForbiddenError('You do not own all referenced files.')
    }

    await next()
})
