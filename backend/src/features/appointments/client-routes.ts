import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { findAppointmentByIdForClient, listAppointmentsForClient } from './services'

export const clientAppointmentRoutes = new Hono()

clientAppointmentRoutes.use(authorized, onlyClientRequest).get('/', async (c) => {
    const user = c.get('user')
    const appointments = await listAppointmentsForClient(user.id)
    return c.json({ appointments }, 200)
})

clientAppointmentRoutes.use(authorized, onlyClientRequest).get('/:appointmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const appointment = await findAppointmentByIdForClient(appointmentId, user.id)
    if (!appointment) {
        throw new NotFoundError()
    }
    return c.json({ appointment }, 200)
})
