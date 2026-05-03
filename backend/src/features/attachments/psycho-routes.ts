import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { clientIdAppointmentIdParamSchema } from 'utils/types'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import {
    createAttachmentPsychoSchema,
    listQuerySchemaPsycho,
    updateAttachmentSchema,
} from './schemas'
import { AttachmentsService } from './services'

const replySchema = z.object({
    reply: z.string().min(1),
})

export const psychoAttachmentRoutes = new Hono().use(authorized, onlyPsychoRequest)

psychoAttachmentRoutes.get(
    '/',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('query', listQuerySchemaPsycho),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const { type } = c.req.valid('query')
        const result = await AttachmentsService.listForPsycho(
            appointmentId,
            user.id,
            clientId,
            type ? [type] : undefined,
        )
        return c.json(result, 200)
    },
)

psychoAttachmentRoutes.post(
    '/',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('json', createAttachmentPsychoSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
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

psychoAttachmentRoutes.get(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const result = await AttachmentsService.getForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId: c.req.param('attachmentId'),
        })
        return c.json(result, 200)
    },
)

psychoAttachmentRoutes.patch(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('json', updateAttachmentSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const attachmentId = c.req.param('attachmentId')
        const { name, text, removeFileIds } = c.req.valid('json')
        const attachment = await AttachmentsService.updateForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId,
            name,
            text,
            removeFileIds,
        })
        return c.json({ attachment }, 200)
    },
)

psychoAttachmentRoutes.patch(
    '/:attachmentId/reply',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('json', replySchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const attachmentId = c.req.param('attachmentId')
        const { reply } = c.req.valid('json')
        const reaction = await AttachmentsService.replyToRecommendationForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId,
            reply,
        })
        return c.json({ reaction }, 200)
    },
)

psychoAttachmentRoutes.delete(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        await AttachmentsService.deleteForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId: c.req.param('attachmentId'),
        })
        return c.body(null, 204)
    },
)
