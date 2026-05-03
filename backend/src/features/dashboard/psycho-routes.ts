import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { DashboardService } from './services'

export const psychoDashboardRoutes = new Hono().use(authorized, onlyPsychoRequest)

psychoDashboardRoutes.get('/', async (c) => {
    const user = c.get('user')
    const dashboard = await DashboardService.getForPsycho(user.id)
    return c.json(dashboard, 200)
})
