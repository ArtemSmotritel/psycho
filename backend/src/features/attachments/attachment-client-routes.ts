import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { AttachmentCheck } from './attachment-check'

export const attachmentClientRoutes = new Hono()

attachmentClientRoutes.use(authorized, onlyClientRequest)

attachmentClientRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')!
    const { attachment, reaction, completion } = await AttachmentCheck.forClient({
        user,
        appointmentId: c.req.param('appointmentId')!,
        attachmentId: c.req.param('attachmentId')!,
    }).run()

    // client per-type rule:
    // - impression: must be authored by this client
    // - recommendation: any psycho-authored is fine
    if (attachment.type === 'impression' && attachment.authorId !== user.id) {
        throw new NotFoundError()
    }

    if (attachment.type === 'recommendation') {
        return c.json({ attachment, reaction }, 200)
    }
    return c.json({ attachment, completion }, 200)
})
