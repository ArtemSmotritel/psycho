import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { appointmentIdParamSchema } from 'utils/types'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { AttachmentsService } from './services'

export const impressionClientRoutes = new Hono().use(authorized, onlyClientRequest)

const completeSchema = z.object({
    response: z.string().min(1),
})

impressionClientRoutes.patch(
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
