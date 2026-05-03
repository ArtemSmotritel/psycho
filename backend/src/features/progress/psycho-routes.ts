import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { clientIdParamSchema } from 'utils/types'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { ProgressService } from './services'

export const psychoProgressRoutes = new Hono().use(authorized, onlyPsychoRequest)

psychoProgressRoutes.get('/', zValidator('param', clientIdParamSchema), async (c) => {
    const user = c.get('user')
    const { clientId } = c.req.valid('param')
    const impressions = await ProgressService.listImpressionsForPsycho(clientId, user.id)
    return c.json({ impressions }, 200)
})
