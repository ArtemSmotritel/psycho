import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { appointmentIdParamSchema } from 'utils/types'
import { authorized, onlyClientRequest, ownsFiles } from '../../middlewares/auth'
import { createAttachmentClientSchema, listQuerySchemaClient } from './schemas'
import { AttachmentsService } from './services'

export const attachmentClientRoutes = new Hono().use(authorized, onlyClientRequest)

attachmentClientRoutes.get(
    '/',
    zValidator('param', appointmentIdParamSchema),
    zValidator('query', listQuerySchemaClient),
    async (c) => {
        const user = c.get('user')
        const { appointmentId } = c.req.valid('param')
        const { type } = c.req.valid('query')
        const result = await AttachmentsService.listForClient(
            appointmentId,
            user.id,
            type ? [type] : undefined,
        )
        return c.json(result, 200)
    },
)

attachmentClientRoutes.post(
    '/',
    zValidator('param', appointmentIdParamSchema),
    zValidator('json', createAttachmentClientSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const { appointmentId } = c.req.valid('param')
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

attachmentClientRoutes.get(
    '/:attachmentId',
    zValidator('param', appointmentIdParamSchema),
    async (c) => {
        const user = c.get('user')
        const { appointmentId } = c.req.valid('param')
        const result = await AttachmentsService.getForClient({
            user,
            appointmentId,
            attachmentId: c.req.param('attachmentId'),
        })
        return c.json(result, 200)
    },
)

attachmentClientRoutes.delete(
    '/:attachmentId',
    zValidator('param', appointmentIdParamSchema),
    async (c) => {
        const user = c.get('user')
        const { appointmentId } = c.req.valid('param')
        await AttachmentsService.deleteForClient({
            user,
            appointmentId,
            attachmentId: c.req.param('attachmentId'),
        })
        return c.body(null, 204)
    },
)
