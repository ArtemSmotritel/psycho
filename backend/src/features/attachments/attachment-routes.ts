import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findAppointmentById } from '../appointments/services'
import { findAttachmentById } from './services'

export const attachmentRoutes = new Hono()

attachmentRoutes.use(authorized, onlyPsychoRequest)

attachmentRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const attachment = await findAttachmentById(attachmentId)
    if (!attachment || attachment.appointmentId !== appointmentId) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ attachment }, 200)
})
