import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { appointmentIdParamSchema } from 'utils/types'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { AttachmentsService } from './services'

const reactionSchema = z.object({
    done: z.boolean().optional(),
    comment: z.string().min(1).optional(),
})

export const recommendationClientRoutes = new Hono().use(authorized, onlyClientRequest)

recommendationClientRoutes.patch(
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
