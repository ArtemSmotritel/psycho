import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { getPsychoDashboard } from './services'

export const psychoDashboardRoutes = new Hono()

psychoDashboardRoutes.use(authorized, onlyPsychoRequest)

psychoDashboardRoutes.get('/', async (c) => {
    const user = c.get('user')

    const dashboard = await getPsychoDashboard(user.id)

    return c.json(dashboard, 200)
})
