import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
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

const createRecommendationSchema = z.object({
    name: z.string().min(1),
    text: z.string().nullable().optional(),
    imageFileIds: z.array(z.string().min(1)).optional().default([]),
    audioFileIds: z.array(z.string().min(1)).optional().default([]),
})

const updateRecommendationSchema = z.object({
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    removeFileIds: z.array(z.string().min(1)).optional(),
})

const replySchema = z.object({
    reply: z.string().min(1),
})

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

recommendationPsychoRoutes.post(
    '/',
    zValidator('json', createRecommendationSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const appointmentId = c.req.param('appointmentId')

        // Steps 1–2: ownership + status check
        const check = await checkAppointmentAccess(c)
        if (!check.ok) return check.response

        const { name, text, imageFileIds, audioFileIds } = c.req.valid('json')

        const recommendation = await createAttachment({
            appointmentId,
            authorId: user.id,
            type: 'recommendation',
            name,
            text: text ?? null,
            imageFileIds,
            audioFileIds,
        })

        // TODO: EDG-56 — send recommendation email to client

        return c.json({ recommendation }, 201)
    },
)

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

recommendationPsychoRoutes.patch(
    '/:attachmentId',
    zValidator('json', updateRecommendationSchema),
    async (c) => {
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

        const { name, text, removeFileIds } = c.req.valid('json')

        const updated = await updateAttachment(attachmentId, {
            name: name ?? null,
            text: text ?? null,
            removeFileIds,
        })

        return c.json({ recommendation: updated }, 200)
    },
)

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

recommendationPsychoRoutes.patch(
    '/:attachmentId/reply',
    zValidator('json', replySchema),
    async (c) => {
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

        const { reply } = c.req.valid('json')

        // Step 3 — reply-once check
        const existing = await findReaction(attachmentId)
        if (existing && existing.psychologistReply !== null) {
            return c.json({ error: 'ReplyAlreadySet', message: 'Reply has already been set.' }, 400)
        }

        const reaction = await setReply(attachmentId, reply)

        return c.json({ reaction }, 200)
    },
)
