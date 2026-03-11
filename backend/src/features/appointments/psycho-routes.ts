import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findActiveAppointmentByPsycho } from './services'

export const psychoAppointmentRoutes = new Hono()

psychoAppointmentRoutes.use(authorized, onlyPsychoRequest).get('/', async (c) => {
    const user = c.get('user')
    const appointment = await findActiveAppointmentByPsycho(user.id)
    return c.json({ appointment }, 200)
})
