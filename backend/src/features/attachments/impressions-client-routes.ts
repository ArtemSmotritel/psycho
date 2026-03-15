import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { findAppointmentByIdForClient } from '../appointments/services'
import { createAttachment, listAttachmentsByAuthor } from './services'

export const impressionClientRoutes = new Hono()

impressionClientRoutes.use(authorized, onlyClientRequest)

impressionClientRoutes.post('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    if (appointment.status === 'upcoming') {
        return c.json(
            { error: 'AppointmentNotStarted', message: 'Appointment has not started yet.' },
            400,
        )
    }

    const body = await c.req.json()
    const { text, imageFileIds, audioFileIds } = body

    const hasText = typeof text === 'string' && text.trim() !== ''
    const hasImages = Array.isArray(imageFileIds) && imageFileIds.length > 0
    const hasAudio = Array.isArray(audioFileIds) && audioFileIds.length > 0

    if (!hasText && !hasImages && !hasAudio) {
        return c.json(
            {
                error: 'BadRequest',
                message: 'At least one of text, imageFileIds, or audioFileIds is required.',
            },
            400,
        )
    }

    const impression = await createAttachment({
        appointmentId,
        authorId: user.id,
        type: 'impression',
        name: null,
        text: hasText ? text.trim() : null,
        imageFileIds: Array.isArray(imageFileIds) ? imageFileIds : [],
        audioFileIds: Array.isArray(audioFileIds) ? audioFileIds : [],
    })

    return c.json({ impression }, 201)
})

impressionClientRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const impressions = await listAttachmentsByAuthor(appointmentId, 'impression', user.id)
    return c.json({ impressions }, 200)
})
