import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AppointmentsService } from '../appointments/services'
import { listAttachments } from './services'

export const impressionPsychoRoutes = new Hono()

impressionPsychoRoutes.use(authorized, onlyPsychoRequest)

impressionPsychoRoutes.get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    await AppointmentsService.getForPsycho(appointmentId, user.id, clientId)

    const impressions = await listAttachments(appointmentId, 'impression')
    return c.json({ impressions }, 200)
})
