import { Hono } from 'hono'
import { authorized, onlyClientRequest, onlyPsychoRequest } from '../../middlewares/auth'
import { getClientDashboard, getPsychoDashboard } from './services'

export const psychoDashboardRoutes = new Hono()

psychoDashboardRoutes.get('/', authorized, onlyPsychoRequest, async (c) => {
    const user = c.get('user')

    const dashboard = await getPsychoDashboard(user!.id)

    return c.json(dashboard, 200)
})

export const clientDashboardRoutes = new Hono()

clientDashboardRoutes.get('/', authorized, onlyClientRequest, async (c) => {
    const user = c.get('user')

    const dashboard = await getClientDashboard(user.id)

    return c.json(dashboard, 200)
})
