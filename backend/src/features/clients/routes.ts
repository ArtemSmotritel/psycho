import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findClientByEmail, findClients } from './services'

export const clientRoutes = new Hono()

clientRoutes
    .use(authorized, onlyPsychoRequest)
    .get('/', async (c) => {
        const user = c.get('user')

        const clients = await findClients({ psychoId: user.id })

        return c.json(clients)
    })
    .get(':clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
    .post('/', (c) => c.text('Hello World!'))
    .post('/findByEmail', async (c) => {
        const { email } = await c.req.json()

        const client = await findClientByEmail(email)

        return c.json({
            exists: !!client,
            client,
        })
    })
    .put('/:clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
    .delete('/:clientId', (c) => c.text(`Hello ${c.req.param('clientId')}!`))
