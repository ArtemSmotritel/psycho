import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { NotFoundError } from 'errors/index'
import {
    authorized,
    onlyClientRequest,
    onlyLinkedClient,
    onlyPsychoRequest,
} from '../../middlewares/auth'
import {
    findClientById,
    findClientPsychoRelationship,
    findClients,
    linkClientByEmailToPsycho,
    unlinkClientFromPsycho,
    updateClient,
} from './services'

const updateClientSchema = z.object({
    name: z.string().optional(),
    username: z.string().optional(),
    phone: z.string().optional(),
    telegram: z.string().optional(),
    instagram: z.string().optional(),
})

const addClientSchema = z.object({
    email: z.email(),
})

export const clientSelfRoutes = new Hono()

clientSelfRoutes
    .get('/me', authorized, onlyClientRequest, async (c) => {
        const user = c.get('user')
        const client = await findClientById(user.id)
        if (!client) {
            throw new NotFoundError()
        }
        return c.json({ client })
    })
    .put(
        '/me',
        authorized,
        onlyClientRequest,
        zValidator('json', updateClientSchema),
        async (c) => {
            const user = c.get('user')
            const { name, username, phone, telegram, instagram } = c.req.valid('json')
            await updateClient(user.id, { name, username, phone, telegram, instagram })
            const client = await findClientById(user.id)
            return c.json({ client })
        },
    )

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
            throw new NotFoundError()
        }
        return c.json({ client })
    })
    .post('/', zValidator('json', addClientSchema), async (c) => {
        const user = c.get('user')
        const { email } = c.req.valid('json')

        const client = await linkClientByEmailToPsycho(user.id, email)

        return c.json({ client }, 201)
    })
    .put('/:clientId', onlyLinkedClient, zValidator('json', updateClientSchema), async (c) => {
        const clientId = c.req.param('clientId')
        const { name, username, phone, telegram, instagram } = c.req.valid('json')
        await updateClient(clientId, { name, username, phone, telegram, instagram })
        const client = await findClientById(clientId)
        return c.json({ client })
    })
    .delete('/:clientId', async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const relationship = await findClientPsychoRelationship(clientId, user.id)
        if (!relationship) {
            throw new NotFoundError()
        }
        await unlinkClientFromPsycho(clientId, user.id)
        return c.json({ success: true })
    })
