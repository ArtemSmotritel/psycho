import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AppointmentsRepo } from '../appointments/repo'
import { notFoundResponse } from './route-helpers'
import { findAttachmentById } from './services'

export const attachmentRoutes = new Hono()

attachmentRoutes.use(authorized, onlyPsychoRequest)

attachmentRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const appointment = await AppointmentsRepo.findByIdForPsycho(appointmentId, user.id, clientId)
    if (!appointment) {
        return notFoundResponse(c)
    }

    const attachment = await findAttachmentById(attachmentId)
    if (!attachment || attachment.appointmentId !== appointmentId) {
        return notFoundResponse(c)
    }

    return c.json({ attachment }, 200)
})
