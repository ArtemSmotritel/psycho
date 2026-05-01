import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { listQuerySchemaPsycho } from './schemas'
import { getAttachmentForPsychoView, listAttachmentsForPsychoView } from './services'

export const attachmentPsychoRoutes = new Hono()

attachmentPsychoRoutes.use(authorized, onlyPsychoRequest)

attachmentPsychoRoutes.get('/', zValidator('query', listQuerySchemaPsycho), async (c) => {
    const user = c.get('user')!
    const { type } = c.req.valid('query')
    const result = await listAttachmentsForPsychoView(
        c.req.param('appointmentId')!,
        user.id,
        c.req.param('clientId')!,
        type ? [type] : undefined,
    )
    return c.json(result, 200)
})

attachmentPsychoRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')!
    const { attachment, reaction, completion } = await getAttachmentForPsychoView({
        user,
        clientId: c.req.param('clientId')!,
        appointmentId: c.req.param('appointmentId')!,
        attachmentId: c.req.param('attachmentId')!,
    })

    if (attachment.type === 'recommendation') {
        return c.json({ attachment, reaction }, 200)
    }
    if (attachment.type === 'impression') {
        return c.json({ attachment, completion }, 200)
    }
    return c.json({ attachment }, 200)
})
