import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { BadRequestError, NotFoundError } from 'errors/index'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { checkAppointmentAccess, checkAppointmentOwnership } from './route-helpers'
import { updateAttachmentSchema } from './schemas'
import {
    deleteAttachment,
    findAndValidateAttachment,
    findReaction,
    setReply,
    updateAttachment,
} from './services'

const replySchema = z.object({
    reply: z.string().min(1),
})

export const recommendationPsychoRoutes = new Hono()

recommendationPsychoRoutes.use(authorized, onlyPsychoRequest)

recommendationPsychoRoutes.patch(
    '/:attachmentId',
    zValidator('json', updateAttachmentSchema),
    async (c) => {
        const user = c.get('user')
        const appointmentId = c.req.param('appointmentId')
        const attachmentId = c.req.param('attachmentId')

        // Steps 1–2: ownership + status check
        await checkAppointmentAccess(c)

        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'recommendation',
            user.id,
        )
        if (!attachment) {
            throw new NotFoundError()
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
    await checkAppointmentAccess(c)

    const attachment = await findAndValidateAttachment(
        attachmentId,
        appointmentId,
        'recommendation',
        user.id,
    )
    if (!attachment) {
        throw new NotFoundError()
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
        await checkAppointmentOwnership(c)

        // Step 2 — attachment chain
        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'recommendation',
            user.id,
        )
        if (!attachment) {
            throw new NotFoundError()
        }

        const { reply } = c.req.valid('json')

        // Step 3 — reply-once check
        const existing = await findReaction(attachmentId)
        if (existing && existing.psychologistReply !== null) {
            throw new BadRequestError('Reply has already been set.', 'ReplyAlreadySet')
        }

        const reaction = await setReply(attachmentId, reply)

        return c.json({ reaction }, 200)
    },
)
