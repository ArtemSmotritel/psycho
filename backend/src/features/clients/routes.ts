import { Hono } from 'hono'
import {
    authorized,
    onlyClientRequest,
    onlyLinkedClient,
    onlyPsychoRequest,
} from '../../middlewares/auth'
import {
    findClientByEmail,
    findClientById,
    findClientPsychoRelationship,
    findClients,
    isClientLinkedToPsycho,
    linkClientToPsycho,
    unlinkClientFromPsycho,
    updateClient,
} from './services'

export const clientSelfRoutes = new Hono()

clientSelfRoutes
    .get('/me', authorized, onlyClientRequest, async (c) => {
        const user = c.get('user')
        const client = await findClientById(user.id)
        if (!client) {
            return c.json({ error: 'NotFound' }, 404)
        }
        return c.json({ client })
    })
    .put('/me', authorized, onlyClientRequest, async (c) => {
        const user = c.get('user')
        const { name, username, phone, telegram, instagram } = await c.req.json()
        await updateClient(user.id, { name, username, phone, telegram, instagram })
        const client = await findClientById(user.id)
        return c.json({ client })
    })

export const clientRoutes = new Hono()

clientRoutes
    .use(authorized, onlyPsychoRequest)
    .get('/', async (c) => {
        const user = c.get('user')

        const clients = await findClients({ psychoId: user.id })

        return c.json({ clients })
    })
    .get(':clientId', onlyLinkedClient, async (c) => {
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
    .put('/:clientId', onlyLinkedClient, async (c) => {
        const clientId = c.req.param('clientId')
        const body = await c.req.json()
        const { name, username, phone, telegram, instagram } = body
        await updateClient(clientId, { name, username, phone, telegram, instagram })
        const client = await findClientById(clientId)
        return c.json({ client })
    })
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
