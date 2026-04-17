import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findAppointmentById } from '../appointments/services'
import { listAttachments, findAttachmentById, findImpressionCompletion } from './services'

export const impressionPsychoRoutes = new Hono()

impressionPsychoRoutes.use(authorized, onlyPsychoRequest)

impressionPsychoRoutes.get('/:attachmentId/completion', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'impression'
    ) {
        return c.json({ error: 'NotFound' }, 404)
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
        return c.json({ error: 'NotFound' }, 404)
    }

    const impressions = await listAttachments(appointmentId, 'impression')
    return c.json({ impressions }, 200)
})
