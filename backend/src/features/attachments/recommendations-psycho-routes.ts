import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import {
    checkAppointmentAccess,
    checkAppointmentOwnership,
    notFoundResponse,
} from './route-helpers'
import { fileArraySchema } from './schemas'
import {
    createAttachment,
    deleteAttachment,
    findAndValidateAttachment,
    findReaction,
    listAttachmentsWithReactions,
    setReply,
    updateAttachment,
} from './services'

const createRecommendationSchema = z.object({
    name: z.string().min(1),
    text: z.string().nullable().optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
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

recommendationPsychoRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    // Step 1 only — status check intentionally not applied for listing
    const check = await checkAppointmentOwnership(c)
    if (!check.ok) return check.response

    const recommendations = await listAttachmentsWithReactions(
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

    const attachment = await findAndValidateAttachment(
        attachmentId,
        appointmentId,
        'recommendation',
        user.id,
    )
    if (!attachment) {
        return notFoundResponse(c)
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

        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'recommendation',
            user.id,
        )
        if (!attachment) {
            return notFoundResponse(c)
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

    const attachment = await findAndValidateAttachment(
        attachmentId,
        appointmentId,
        'recommendation',
        user.id,
    )
    if (!attachment) {
        return notFoundResponse(c)
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
        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'recommendation',
            user.id,
        )
        if (!attachment) {
            return notFoundResponse(c)
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
