import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { clientIdAppointmentIdParamSchema } from 'utils/types'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { updateAttachmentSchema } from './schemas'
import { AttachmentsService } from './services'

export const noteRoutes = new Hono().use(authorized, onlyPsychoRequest)

noteRoutes.patch(
    '/:attachmentId',
    zValidator('param', clientIdAppointmentIdParamSchema),
    zValidator('json', updateAttachmentSchema),
    async (c) => {
        const user = c.get('user')
        const { clientId, appointmentId } = c.req.valid('param')
        const attachmentId = c.req.param('attachmentId')
        const { name, text, removeFileIds } = c.req.valid('json')

        const note = await AttachmentsService.updateNoteForPsycho({
            user,
            clientId,
            appointmentId,
            attachmentId,
            name,
            text,
            removeFileIds,
        })

        return c.json({ note }, 200)
    },
)
