import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest, ownsFiles } from '../../middlewares/auth'
import { checkAppointmentAccess, notFoundResponse } from './route-helpers'
import { fileArraySchema } from './schemas'
import {
    createAttachment,
    deleteAttachment,
    findAndValidateAttachment,
    listAttachmentsByAuthor,
    updateAttachment,
} from './services'

const createNoteSchema = z.object({
    name: z.string().min(1),
    text: z.string().nullable().optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
})

const updateNoteSchema = z.object({
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    removeFileIds: z.array(z.string().min(1)).optional(),
})

export const noteRoutes = new Hono()

noteRoutes.use(authorized, onlyPsychoRequest)

noteRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const notes = await listAttachmentsByAuthor(appointmentId, 'note', user.id)
    return c.json({ notes }, 200)
})

noteRoutes.post('/', zValidator('json', createNoteSchema), ownsFiles, async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

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

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'note', user.id)
    if (!attachment) {
        return notFoundResponse(c)
    }

    return c.json({ note: attachment }, 200)
})

noteRoutes.patch('/:attachmentId', zValidator('json', updateNoteSchema), async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'note', user.id)
    if (!attachment) {
        return notFoundResponse(c)
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

    const check = await checkAppointmentAccess(c)
    if (!check.ok) return check.response

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'note', user.id)
    if (!attachment) {
        return notFoundResponse(c)
    }

    await deleteAttachment(attachmentId)
    return c.json({ success: true }, 200)
})
