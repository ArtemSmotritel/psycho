import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import {
    findClientByEmail,
    findClientById,
    findClientPsychoRelationship,
    findClients,
    isClientLinkedToPsycho,
    linkClientToPsycho,
    unlinkClientFromPsycho,
} from './services'

export const clientRoutes = new Hono()

clientRoutes
    .use(authorized, onlyPsychoRequest)
    .get('/', async (c) => {
        const user = c.get('user')

        const clients = await findClients({ psychoId: user.id })

        return c.json({ clients })
    })
    .get(':clientId', async (c) => {
        const client = await findClientById(c.req.param('clientId'))
        if (!client) {
            return c.json({ error: 'NotFound' }, 404)
        }
        return c.json({ client })
    })
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

        const alreadyLinked = await isClientLinkedToPsycho(client.id, user.id)
        if (alreadyLinked) {
            return c.json(
                { error: 'AlreadyLinked', message: 'This client is already in your list.' },
                400,
            )
        }

        await linkClientToPsycho(client.id, user.id)

        return c.json({ client }, 201)
    })
    .put('/:clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
    .delete('/:clientId', async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const relationship = await findClientPsychoRelationship(clientId, user.id)
        if (!relationship) {
            return c.json({ error: 'NotFound' }, 404)
        }
        await unlinkClientFromPsycho(clientId, user.id)
        return c.json({ success: true })
    })
