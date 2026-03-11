import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { listAppointmentsForClient } from './services'

export const clientAppointmentRoutes = new Hono()

clientAppointmentRoutes.use(authorized, onlyClientRequest).get('/', async (c) => {
    const user = c.get('user')
    const appointments = await listAppointmentsForClient(user.id)
    return c.json({ appointments }, 200)
})
