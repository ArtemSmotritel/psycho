import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { BadRequestError } from 'errors/index'
import { clientIdParamSchema } from 'utils/types'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { ClientsRepo } from '../clients/repo'
import { listImpressionsForClientByPsycho } from './services'

export const progressPsychoRoutes = new Hono().use(authorized, onlyPsychoRequest)

progressPsychoRoutes.get('/', zValidator('param', clientIdParamSchema), async (c) => {
    const user = c.get('user')
    const { clientId } = c.req.valid('param')

    const linked = await ClientsRepo.isLinkedToPsycho(clientId, user.id)
    if (!linked) {
        throw new BadRequestError('This client is not in your list.', 'ClientNotLinked')
    }

    const impressions = await listImpressionsForClientByPsycho(clientId, user.id)
    return c.json({ impressions }, 200)
})
