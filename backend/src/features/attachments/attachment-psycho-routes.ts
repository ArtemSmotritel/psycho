import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AttachmentCheck } from './attachment-check'

export const attachmentPsychoRoutes = new Hono()

attachmentPsychoRoutes.use(authorized, onlyPsychoRequest)

attachmentPsychoRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')!
    const { attachment, reaction, completion } = await AttachmentCheck.forPsycho({
        user,
        clientId: c.req.param('clientId')!,
        appointmentId: c.req.param('appointmentId')!,
        attachmentId: c.req.param('attachmentId')!,
    }).run()

    // psycho per-type rule:
    // - impression: any author
    // - note / recommendation: must be authored by this psycho
    if (attachment.type !== 'impression' && attachment.authorId !== user.id) {
        throw new NotFoundError()
    }

    if (attachment.type === 'recommendation') {
        return c.json({ attachment, reaction }, 200)
    }
    if (attachment.type === 'impression') {
        return c.json({ attachment, completion }, 200)
    }
    return c.json({ attachment }, 200)
})
