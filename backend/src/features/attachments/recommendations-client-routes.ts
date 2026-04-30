import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { BadRequestError, NotFoundError } from 'errors/index'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { AppointmentsService } from '../appointments/services'
import {
    findAndValidateAttachment,
    findReaction,
    listAttachmentsWithReactions,
    upsertReaction,
} from './services'

const reactionSchema = z.object({
    done: z.boolean().optional(),
    comment: z.string().min(1).optional(),
})

export const recommendationClientRoutes = new Hono()

recommendationClientRoutes.use(authorized, onlyClientRequest)

recommendationClientRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    await AppointmentsService.getForClient(appointmentId, user.id)

    const recommendations = await listAttachmentsWithReactions(appointmentId, 'recommendation')
    return c.json({ recommendations }, 200)
})

recommendationClientRoutes.patch(
    '/:attachmentId/reaction',
    zValidator('json', reactionSchema),
    async (c) => {
        const user = c.get('user')
        const appointmentId = c.req.param('appointmentId')
        const attachmentId = c.req.param('attachmentId')

        // Step 1 — appointment ownership
        await AppointmentsService.getForClient(appointmentId, user.id)

        // Step 2 — attachment chain
        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'recommendation',
        )
        if (!attachment) {
            throw new NotFoundError()
        }

        const { done, comment } = c.req.valid('json')

        // Body must have at least one of done or comment
        if (done === undefined && comment === undefined) {
            throw new BadRequestError('done or comment is required')
        }

        // Step 3 — comment-once check
        if (comment !== undefined) {
            const existing = await findReaction(attachmentId)
            if (existing && existing.clientComment !== null) {
                throw new BadRequestError('Comment has already been set.', 'CommentAlreadySet')
            }
        }

        const reaction = await upsertReaction(attachmentId, {
            done,
            comment,
        })

        return c.json({ reaction }, 200)
    },
)
