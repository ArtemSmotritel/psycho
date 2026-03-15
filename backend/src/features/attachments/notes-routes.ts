import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findAppointmentById } from '../appointments/services'
import {
    createAttachment,
    deleteAttachment,
    findAttachmentById,
    listAttachmentsByAuthor,
    updateAttachment,
} from './services'

export const noteRoutes = new Hono()

noteRoutes.use(authorized, onlyPsychoRequest)

/**
 * Steps 1–2: appointment ownership + status check.
 * Returns 404 if not found / ownership fails.
 * Returns 400 AppointmentNotActive if upcoming.
 */
async function checkAppointmentAccess(
    c: any,
): Promise<{ ok: true; appointment: any } | { ok: false; response: Response }> {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return { ok: false, response: c.json({ error: 'NotFound' }, 404) }
    }

    if (appointment.status === 'upcoming') {
        return {
            ok: false,
            response: c.json(
                { error: 'AppointmentNotActive', message: 'Appointment is not active or past.' },
                400,
            ),
        }
    }

    return { ok: true, appointment }
}

noteRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const notes = await listAttachmentsByAuthor(appointmentId, 'note', user.id)
    return c.json({ notes }, 200)
})

noteRoutes.post('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const body = await c.req.json()
    const { name, text, imageFileIds, audioFileIds } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return c.json({ error: 'BadRequest', message: 'name is required' }, 400)
    }

    const note = await createAttachment({
        appointmentId,
        authorId: user.id,
        type: 'note',
        name: name.trim(),
        text: text ?? null,
        imageFileIds: Array.isArray(imageFileIds) ? imageFileIds : [],
        audioFileIds: Array.isArray(audioFileIds) ? audioFileIds : [],
    })

    return c.json({ note }, 201)
})

noteRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'note' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ note: attachment }, 200)
})

noteRoutes.patch('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'note' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const body = await c.req.json()
    // imageUrls / audioUrls silently ignored
    const { name, text } = body

    const updated = await updateAttachment(attachmentId, {
        name: name !== undefined ? name : null,
        text: text !== undefined ? text : null,
    })

    return c.json({ note: updated }, 200)
})

noteRoutes.delete('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'note' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    await deleteAttachment(attachmentId)
    return c.json({ success: true }, 200)
})
