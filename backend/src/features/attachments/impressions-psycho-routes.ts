import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findAppointmentById } from '../appointments/services'
import { notFoundResponse } from './route-helpers'
import { listAttachments, findAndValidateAttachment, findImpressionCompletion } from './services'

export const impressionPsychoRoutes = new Hono()

impressionPsychoRoutes.use(authorized, onlyPsychoRequest)

impressionPsychoRoutes.get('/:attachmentId/completion', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return notFoundResponse(c)
    }

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'impression')
    if (!attachment) {
        return notFoundResponse(c)
    }

    const completion = await findImpressionCompletion(attachmentId)
    return c.json({ completion }, 200)
})

impressionPsychoRoutes.get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return notFoundResponse(c)
    }

    const impressions = await listAttachments(appointmentId, 'impression')
    return c.json({ impressions }, 200)
})
