import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AppointmentsService } from './services'

export const psychoAppointmentRoutes = new Hono().use(authorized, onlyPsychoRequest)

psychoAppointmentRoutes.get('/all', async (c) => {
    const user = c.get('user')
    const appointments = await AppointmentsService.listAllForPsycho(user.id)
    return c.json({ appointments }, 200)
})

psychoAppointmentRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointment = await AppointmentsService.getActiveForPsycho(user.id)
    return c.json({ appointment }, 200)
})
