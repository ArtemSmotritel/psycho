import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { AppointmentsService } from './services'

export const clientAppointmentRoutes = new Hono().use(authorized, onlyClientRequest)

clientAppointmentRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointments = await AppointmentsService.listForClient(user.id)
    return c.json({ appointments }, 200)
})

clientAppointmentRoutes.get('/:appointmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const appointment = await AppointmentsService.getForClient(appointmentId, user.id)
    return c.json({ appointment }, 200)
})
