import { createMiddleware } from 'hono/factory'
import type { MiddlewareVariable } from 'utils/types'
import { findClientById } from './services'

export const clientExistsInPath = createMiddleware<MiddlewareVariable<'client', object>>(
    async (c, next) => {
        const id = c.req.param('clientId')

        const client = await findClientById(id)
        if (client) {
            c.set('client', client)
            await next()
            return
        }

        c.json({ error: 'NotFound' }, 404)
    },
)
