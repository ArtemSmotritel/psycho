import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { checkAppointmentAccess } from './route-helpers'
import { updateAttachmentSchema } from './schemas'
import { findAndValidateAttachment, updateAttachment } from './services'

export const noteRoutes = new Hono()

noteRoutes.use(authorized, onlyPsychoRequest)

noteRoutes.patch('/:attachmentId', zValidator('json', updateAttachmentSchema), async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    await checkAppointmentAccess(c)

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'note', user.id)
    if (!attachment) {
        throw new NotFoundError()
    }

    const { name, text, removeFileIds } = c.req.valid('json')

    const updated = await updateAttachment(attachmentId, {
        name: name ?? null,
        text: text ?? null,
        removeFileIds,
    })

    return c.json({ note: updated }, 200)
})
