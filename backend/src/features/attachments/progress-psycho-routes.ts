import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { ClientsRepo } from '../clients/repo'
import { listImpressionsForClientByPsycho } from './services'

export const progressPsychoRoutes = new Hono()

progressPsychoRoutes.use(authorized, onlyPsychoRequest)

progressPsychoRoutes.get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')

    const linked = await ClientsRepo.isLinkedToPsycho(clientId, user.id)
    if (!linked) {
        return c.json(
            { error: 'ClientNotLinked', message: 'This client is not in your list.' },
            400,
        )
    }

    const impressions = await listImpressionsForClientByPsycho(clientId, user.id)
    return c.json({ impressions }, 200)
})
