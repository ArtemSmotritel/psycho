import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { BadRequestError, NotFoundError } from 'errors/index'
import { appointmentIdParamSchema } from 'utils/types'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { AppointmentsService } from '../appointments/services'
import { findAndValidateAttachment, findImpressionCompletion, completeImpression } from './services'

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

        await AppointmentsService.getForClient(appointmentId, user.id)

        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'impression',
            user.id,
        )
        if (!attachment) {
            throw new NotFoundError()
        }

        const existing = await findImpressionCompletion(attachmentId)
        if (existing) {
            throw new BadRequestError(
                'This impression has already been completed.',
                'AlreadyCompleted',
            )
        }

        const { response } = c.req.valid('json')
        const completion = await completeImpression(attachmentId, response)
        return c.json({ completion }, 200)
    },
)
