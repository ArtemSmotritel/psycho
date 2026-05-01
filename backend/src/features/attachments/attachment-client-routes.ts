import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { listQuerySchemaClient } from './schemas'
import { getAttachmentForClientView, listAttachmentsForClientView } from './services'

export const attachmentClientRoutes = new Hono()

attachmentClientRoutes.use(authorized, onlyClientRequest)

attachmentClientRoutes.get('/', zValidator('query', listQuerySchemaClient), async (c) => {
    const user = c.get('user')!
    const { type } = c.req.valid('query')
    const result = await listAttachmentsForClientView(
        c.req.param('appointmentId')!,
        user.id,
        type ? [type] : undefined,
    )
    return c.json(result, 200)
})

attachmentClientRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')!
    const { attachment, reaction, completion } = await getAttachmentForClientView({
        user,
        appointmentId: c.req.param('appointmentId')!,
        attachmentId: c.req.param('attachmentId')!,
    })

    if (attachment.type === 'recommendation') {
        return c.json({ attachment, reaction }, 200)
    }
    return c.json({ attachment, completion }, 200)
})
