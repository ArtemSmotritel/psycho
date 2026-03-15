import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { findAppointmentById } from '../appointments/services'
import {
    createAttachment,
    deleteAttachment,
    findAttachmentById,
    findReaction,
    listAttachmentsWithReactionsByAuthor,
    setReply,
    updateAttachment,
} from './services'

export const recommendationPsychoRoutes = new Hono()

recommendationPsychoRoutes.use(authorized, onlyPsychoRequest)

/**
 * Step 1: appointment ownership only (no status check for GET /).
 * Returns 404 if not found / ownership fails.
 */
async function checkAppointmentOwnership(
    c: any,
): Promise<{ ok: true; appointment: any } | { ok: false; response: Response }> {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return { ok: false, response: c.json({ error: 'NotFound' }, 404) }
    }

    return { ok: true, appointment }
}

/**
 * Steps 1–2: appointment ownership + status check.
 * Returns 404 if not found / ownership fails.
 * Returns 400 AppointmentNotActive if upcoming.
 */
async function checkAppointmentAccess(
    c: any,
): Promise<{ ok: true; appointment: any } | { ok: false; response: Response }> {
    const ownership = await checkAppointmentOwnership(c)
    if (!ownership.ok) return ownership

    const { appointment } = ownership
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

recommendationPsychoRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    // Step 1 only — status check intentionally not applied for listing
    const check = await checkAppointmentOwnership(c)
    if (!check.ok) return check.response

    const recommendations = await listAttachmentsWithReactionsByAuthor(
        appointmentId,
        'recommendation',
        user.id,
    )
    return c.json({ recommendations }, 200)
})

recommendationPsychoRoutes.post('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    // Steps 1–2: ownership + status check
    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const body = await c.req.json()
    const { name, text, imageFileIds, audioFileIds } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return c.json({ error: 'BadRequest', message: 'name is required' }, 400)
    }

    const recommendation = await createAttachment({
        appointmentId,
        authorId: user.id,
        type: 'recommendation',
        name: name.trim(),
        text: text ?? null,
        imageFileIds: Array.isArray(imageFileIds) ? imageFileIds : [],
        audioFileIds: Array.isArray(audioFileIds) ? audioFileIds : [],
    })

    // TODO: EDG-56 — send recommendation email to client

    return c.json({ recommendation }, 201)
})

recommendationPsychoRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    // Steps 1–2: ownership + status check
    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'recommendation' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ recommendation: attachment }, 200)
})

recommendationPsychoRoutes.patch('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    // Steps 1–2: ownership + status check
    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'recommendation' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const body = await c.req.json()
    // imageFileIds / audioFileIds silently ignored
    const { name, text } = body

    const updated = await updateAttachment(attachmentId, {
        name: name !== undefined ? name : null,
        text: text !== undefined ? text : null,
    })

    return c.json({ recommendation: updated }, 200)
})

recommendationPsychoRoutes.delete('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    // Steps 1–2: ownership + status check
    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'recommendation' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    await deleteAttachment(attachmentId)
    return c.json({ success: true }, 200)
})

recommendationPsychoRoutes.patch('/:attachmentId/reply', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    // Step 1 — appointment ownership
    const check = await checkAppointmentOwnership(c)
    if (!check.ok) return check.response

    // Step 2 — attachment chain
    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'recommendation' ||
        attachment.authorId !== user.id
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const body = await c.req.json()
    const { reply } = body

    // Body validation
    if (!reply || typeof reply !== 'string' || reply.trim() === '') {
        return c.json({ error: 'BadRequest', message: 'reply is required' }, 400)
    }

    // Step 3 — reply-once check
    const existing = await findReaction(attachmentId)
    if (existing && existing.psychologistReply !== null) {
        return c.json({ error: 'ReplyAlreadySet', message: 'Reply has already been set.' }, 400)
    }

    const reaction = await setReply(attachmentId, reply.trim())

    return c.json({ reaction }, 200)
})
