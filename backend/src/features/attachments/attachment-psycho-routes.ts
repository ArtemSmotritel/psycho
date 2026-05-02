import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import { createAttachmentPsychoSchema, listQuerySchemaPsycho } from './schemas'
import { AttachmentsService } from './services'

export const attachmentPsychoRoutes = new Hono().use(authorized, onlyPsychoRequest)

attachmentPsychoRoutes.get('/', zValidator('query', listQuerySchemaPsycho), async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const clientId = c.req.param('clientId')
    const { type } = c.req.valid('query')
    const result = await AttachmentsService.listForPsycho(
        appointmentId,
        user.id,
        clientId,
        type ? [type] : undefined,
    )
    return c.json(result, 200)
})

attachmentPsychoRoutes.post(
    '/',
    zValidator('json', createAttachmentPsychoSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const appointmentId = c.req.param('appointmentId')
        const { type, name, text, imageFileIds, audioFileIds } = c.req.valid('json')
        const attachment = await AttachmentsService.createForPsycho({
            psychoId: user.id,
            clientId,
            appointmentId,
            type,
            name,
            text,
            imageFileIds,
            audioFileIds,
        })
        return c.json({ attachment }, 201)
    },
)

attachmentPsychoRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const result = await AttachmentsService.getForPsycho({
        user,
        clientId: c.req.param('clientId'),
        appointmentId: c.req.param('appointmentId'),
        attachmentId: c.req.param('attachmentId'),
    })
    return c.json(result, 200)
})

attachmentPsychoRoutes.delete('/:attachmentId', async (c) => {
    const user = c.get('user')
    await AttachmentsService.deleteForPsycho({
        user,
        clientId: c.req.param('clientId'),
        appointmentId: c.req.param('appointmentId'),
        attachmentId: c.req.param('attachmentId'),
    })
    return c.body(null, 204)
})
