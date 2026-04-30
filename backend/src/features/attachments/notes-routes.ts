import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { NotFoundError } from 'errors/index'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import { checkAppointmentAccess } from './route-helpers'
import { createAttachmentSchema, updateAttachmentSchema } from './schemas'
import {
    createAttachment,
    deleteAttachment,
    findAndValidateAttachment,
    listAttachmentsByAuthor,
    updateAttachment,
} from './services'

export const noteRoutes = new Hono()

noteRoutes.use(authorized, onlyPsychoRequest)

noteRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    await checkAppointmentAccess(c)

    const notes = await listAttachmentsByAuthor(appointmentId, 'note', user.id)
    return c.json({ notes }, 200)
})

noteRoutes.post('/', zValidator('json', createAttachmentSchema), ownsFiles, async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    await checkAppointmentAccess(c)

    const { name, text, imageFileIds, audioFileIds } = c.req.valid('json')

    const note = await createAttachment({
        appointmentId,
        authorId: user.id,
        type: 'note',
        name,
        text: text ?? null,
        imageFileIds,
        audioFileIds,
    })

    return c.json({ note }, 201)
})

noteRoutes.get('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    await checkAppointmentAccess(c)

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'note', user.id)
    if (!attachment) {
        throw new NotFoundError()
    }

    return c.json({ note: attachment }, 200)
})

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

noteRoutes.delete('/:attachmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    await checkAppointmentAccess(c)

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'note', user.id)
    if (!attachment) {
        throw new NotFoundError()
    }

    await deleteAttachment(attachmentId)
    return c.json({ success: true }, 200)
})
