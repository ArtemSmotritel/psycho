import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { DashboardService } from './services'

export const clientDashboardRoutes = new Hono().use(authorized, onlyClientRequest)

clientDashboardRoutes.get('/', async (c) => {
    const user = c.get('user')
    const dashboard = await DashboardService.getForClient(user.id)
    return c.json(dashboard, 200)
})
