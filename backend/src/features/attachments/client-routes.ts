import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { appointmentIdParamSchema } from 'utils/types'
import { authorized, onlyClientRequest, ownsFiles } from '../../middlewares/auth'
import { createAttachmentClientSchema, listQuerySchemaClient } from './schemas'
import { AttachmentsService } from './services'

const reactionSchema = z.object({
    done: z.boolean().optional(),
    comment: z.string().min(1).optional(),
})

const completeSchema = z.object({
    response: z.string().min(1),
})

export const clientAttachmentRoutes = new Hono().use(authorized, onlyClientRequest)

clientAttachmentRoutes.get(
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

clientAttachmentRoutes.post(
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

clientAttachmentRoutes.get(
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

clientAttachmentRoutes.patch(
    '/:attachmentId/reaction',
    zValidator('param', appointmentIdParamSchema),
    zValidator('json', reactionSchema),
    async (c) => {
        const user = c.get('user')
        const { appointmentId } = c.req.valid('param')
        const attachmentId = c.req.param('attachmentId')
        const { done, comment } = c.req.valid('json')
        const reaction = await AttachmentsService.reactToRecommendationForClient({
            user,
            appointmentId,
            attachmentId,
            done,
            comment,
        })
        return c.json({ reaction }, 200)
    },
)

clientAttachmentRoutes.patch(
    '/:attachmentId/complete',
    zValidator('param', appointmentIdParamSchema),
    zValidator('json', completeSchema),
    async (c) => {
        const user = c.get('user')
        const { appointmentId } = c.req.valid('param')
        const attachmentId = c.req.param('attachmentId')
        const { response } = c.req.valid('json')
        const completion = await AttachmentsService.completeImpressionForClient({
            user,
            appointmentId,
            attachmentId,
            response,
        })
        return c.json({ completion }, 200)
    },
)

clientAttachmentRoutes.delete(
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
