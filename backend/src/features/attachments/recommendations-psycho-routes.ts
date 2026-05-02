import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { clientIdAppointmentIdParamSchema } from 'utils/types'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { updateAttachmentSchema } from './schemas'
import { AttachmentsService } from './services'

const replySchema = z.object({
    reply: z.string().min(1),
})

export const recommendationPsychoRoutes = new Hono().use(authorized, onlyPsychoRequest)

recommendationPsychoRoutes.patch(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('json', updateAttachmentSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const attachmentId = c.req.param('attachmentId')
        const { name, text, removeFileIds } = c.req.valid('json')

        const recommendation = await AttachmentsService.updateRecommendationForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId,
            name,
            text,
            removeFileIds,
        })

        return c.json({ recommendation }, 200)
    },
)

recommendationPsychoRoutes.patch(
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
