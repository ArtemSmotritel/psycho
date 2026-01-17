import { createMiddleware } from 'hono/factory'
import { auth } from 'utils/auth'
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

    await next()
})

export const onlyPsychoRequest = createMiddleware(async (c, next) => {
    const role = c.get('role')

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

    if (role !== CLIENT_ROLE) {
        return c.json({ error: 'Unauthorized' }, 403)
    }

    await next()
})
