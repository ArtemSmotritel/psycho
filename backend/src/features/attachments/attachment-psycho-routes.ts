import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import { createAttachmentPsychoSchema, listQuerySchemaPsycho } from './schemas'
import {
    createAttachmentForPsychoView,
    deleteAttachmentForPsychoView,
    getAttachmentForPsychoView,
    listAttachmentsForPsychoView,
} from './services'

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

attachmentPsychoRoutes.post(
    '/',
    zValidator('json', createAttachmentPsychoSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')!
        const body = c.req.valid('json')
        const attachment = await createAttachmentForPsychoView({
            psychoId: user.id,
            clientId: c.req.param('clientId')!,
            appointmentId: c.req.param('appointmentId')!,
            ...body,
        })
        return c.json({ attachment }, 201)
    },
)

attachmentPsychoRoutes.delete('/:attachmentId', async (c) => {
    const user = c.get('user')!
    await deleteAttachmentForPsychoView({
        user,
        clientId: c.req.param('clientId')!,
        appointmentId: c.req.param('appointmentId')!,
        attachmentId: c.req.param('attachmentId')!,
    })
    return c.body(null, 204)
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
