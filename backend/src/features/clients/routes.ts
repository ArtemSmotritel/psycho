import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findClientByEmail, findClients, linkClientToPsycho } from './services'

export const clientRoutes = new Hono()

clientRoutes
    .use(authorized, onlyPsychoRequest)
    .get('/', async (c) => {
        const user = c.get('user')

        const clients = await findClients({ psychoId: user.id })

        return c.json({ clients })
    })
    .get(':clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
    .post('/', async (c) => {
        const user = c.get('user')
        const body = await c.req.json()
        const { email } = body

        if (!email) {
            return c.json({ error: 'BadRequest', message: 'email is required' }, 400)
        }

        const client = await findClientByEmail(email)

        if (!client) {
            return c.json(
                {
                    error: 'ClientNotFound',
                    message: 'No account found for this email. Ask your client to register first.',
                },
                400,
            )
        }

        try {
            await linkClientToPsycho(client.id, user.id)
        } catch (err: any) {
            if (err.code === '23505') {
                return c.json(
                    { error: 'AlreadyLinked', message: 'This client is already in your list.' },
                    400,
                )
            }
            throw err
        }

        return c.json({ client }, 201)
    })
    .put('/:clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
    .delete('/:clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
