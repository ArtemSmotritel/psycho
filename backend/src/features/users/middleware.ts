import { createMiddleware } from 'hono/factory'
import type { MiddlewareVariable } from 'utils/types'
import { findUserById } from './service'

export const userExistsInParam = createMiddleware<MiddlewareVariable<'user', object>>(
    async (c, next) => {
        const id = c.req.param('userId')

        const user = await findUserById(id)
        if (user) {
            c.set('user', user)
            await next()
            return
        }

        c.json({ error: 'NotFound' }, 404)
    },
)
