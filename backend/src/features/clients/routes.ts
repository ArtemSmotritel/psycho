import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import {
    authorized,
    onlyClientRequest,
    onlyLinkedClient,
    onlyPsychoRequest,
} from '../../middlewares/auth'
import { ClientsService } from './services'

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

export const clientSelfRoutes = new Hono().use('/me', authorized, onlyClientRequest)

clientSelfRoutes.get('/me', async (c) => {
    const user = c.get('user')
    const client = await ClientsService.getById(user.id)
    return c.json({ client }, 200)
})

clientSelfRoutes.put('/me', zValidator('json', updateClientSchema), async (c) => {
    const user = c.get('user')
    const params = c.req.valid('json')
    const client = await ClientsService.updateProfile(user.id, params)
    return c.json({ client }, 200)
})

export const clientRoutes = new Hono().use(authorized, onlyPsychoRequest)

clientRoutes.get('/', async (c) => {
    const user = c.get('user')
    const clients = await ClientsService.listForPsycho(user.id)
    return c.json({ clients }, 200)
})

clientRoutes.get('/:clientId', onlyLinkedClient, async (c) => {
    const clientId = c.req.param('clientId')
    const client = await ClientsService.getById(clientId)
    return c.json({ client }, 200)
})

clientRoutes.post('/', zValidator('json', addClientSchema), async (c) => {
    const user = c.get('user')
    const { email } = c.req.valid('json')
    const client = await ClientsService.linkByEmailToPsycho(user.id, email)
    return c.json({ client }, 201)
})

clientRoutes.put(
    '/:clientId',
    onlyLinkedClient,
    zValidator('json', updateClientSchema),
    async (c) => {
        const clientId = c.req.param('clientId')
        const params = c.req.valid('json')
        const client = await ClientsService.updateProfile(clientId, params)
        return c.json({ client }, 200)
    },
)

clientRoutes.delete('/:clientId', onlyLinkedClient, async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    await ClientsService.unlinkForPsycho(clientId, user.id)
    return c.body(null, 204)
})
