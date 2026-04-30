import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AppointmentsService } from '../appointments/services'
import { findAttachmentById } from './services'

export const attachmentRoutes = new Hono()

attachmentRoutes.use(authorized, onlyPsychoRequest)

attachmentRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    await AppointmentsService.getForPsycho(appointmentId, user.id, clientId)

    const attachment = await findAttachmentById(attachmentId)
    if (!attachment || attachment.appointmentId !== appointmentId) {
        throw new NotFoundError()
    }

    return c.json({ attachment }, 200)
})
