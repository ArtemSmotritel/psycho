import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { findAppointmentByIdForClient } from '../appointments/services'
import {
    findAttachmentById,
    findReaction,
    listAttachmentsWithReactions,
    upsertReaction,
} from './services'

export const recommendationClientRoutes = new Hono()

recommendationClientRoutes.use(authorized, onlyClientRequest)

recommendationClientRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const recommendations = await listAttachmentsWithReactions(appointmentId, 'recommendation')
    return c.json({ recommendations }, 200)
})

recommendationClientRoutes.patch('/:attachmentId/reaction', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    // Step 1 — appointment ownership
    const appointment = await findAppointmentByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    // Step 2 — attachment chain
    const attachment = await findAttachmentById(attachmentId)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== 'recommendation'
    ) {
        return c.json({ error: 'NotFound' }, 404)
    }

    const body = await c.req.json()
    const { done, comment } = body

    // Body must have at least one of done or comment
    if (done === undefined && comment === undefined) {
        return c.json({ error: 'BadRequest', message: 'done or comment is required' }, 400)
    }

    // Step 3 — comment-once check
    if (comment !== undefined) {
        const existing = await findReaction(attachmentId)
        if (existing && existing.clientComment !== null) {
            return c.json(
                { error: 'CommentAlreadySet', message: 'Comment has already been set.' },
                400,
            )
        }
    }

    const reaction = await upsertReaction(attachmentId, {
        done: done !== undefined ? Boolean(done) : undefined,
        comment: comment !== undefined ? String(comment) : undefined,
    })

    return c.json({ reaction }, 200)
})
