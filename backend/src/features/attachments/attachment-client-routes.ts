import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authorized, onlyClientRequest, ownsFiles } from '../../middlewares/auth'
import { createAttachmentClientSchema, listQuerySchemaClient } from './schemas'
import { AttachmentsService } from './services'

export const attachmentClientRoutes = new Hono().use(authorized, onlyClientRequest)

attachmentClientRoutes.get('/', zValidator('query', listQuerySchemaClient), async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const { type } = c.req.valid('query')
    const result = await AttachmentsService.listForClient(
        appointmentId,
        user.id,
        type ? [type] : undefined,
    )
    return c.json(result, 200)
})

attachmentClientRoutes.post(
    '/',
    zValidator('json', createAttachmentClientSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const appointmentId = c.req.param('appointmentId')
        const { name, text, imageFileIds, audioFileIds } = c.req.valid('json')
        const attachment = await AttachmentsService.createForClient({
            clientId: user.id,
            appointmentId,
            name,
            text,
            imageFileIds,
            audioFileIds,
        })
        return c.json({ attachment }, 201)
    },
)

attachmentClientRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const result = await AttachmentsService.getForClient({
        user,
        appointmentId: c.req.param('appointmentId'),
        attachmentId: c.req.param('attachmentId'),
    })
    return c.json(result, 200)
})

attachmentClientRoutes.delete('/:attachmentId', async (c) => {
    const user = c.get('user')
    await AttachmentsService.deleteForClient({
        user,
        appointmentId: c.req.param('appointmentId'),
        attachmentId: c.req.param('attachmentId'),
    })
    return c.body(null, 204)
})
