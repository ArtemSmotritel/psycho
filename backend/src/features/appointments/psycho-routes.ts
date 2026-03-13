import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findActiveAppointmentByPsycho, listAllAppointmentsForPsycho } from './services'

export const psychoAppointmentRoutes = new Hono()

psychoAppointmentRoutes.use(authorized, onlyPsychoRequest).get('/all', async (c) => {
    const user = c.get('user')
    const appointments = await listAllAppointmentsForPsycho(user.id)
    return c.json({ appointments }, 200)
})

psychoAppointmentRoutes.use(authorized, onlyPsychoRequest).get('/', async (c) => {
    const user = c.get('user')
    const appointment = await findActiveAppointmentByPsycho(user.id)
    return c.json({ appointment }, 200)
})
