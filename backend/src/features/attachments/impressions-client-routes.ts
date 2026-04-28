import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyClientRequest, ownsFiles } from '../../middlewares/auth'
import { AppointmentsRepo } from '../appointments/repo'
import { notFoundResponse } from './route-helpers'
import { fileArraySchema } from './schemas'
import {
    createAttachment,
    listAttachmentsByAuthor,
    findAndValidateAttachment,
    findImpressionCompletion,
    completeImpression,
} from './services'

const createImpressionSchema = z.object({
    text: z.string().optional(),
    imageFileIds: fileArraySchema,
    audioFileIds: fileArraySchema,
})

export const impressionClientRoutes = new Hono()

impressionClientRoutes.use(authorized, onlyClientRequest)

impressionClientRoutes.post(
    '/',
    zValidator('json', createImpressionSchema),
    ownsFiles,
    async (c) => {
        const user = c.get('user')
        const appointmentId = c.req.param('appointmentId')

        const appointment = await AppointmentsRepo.findByIdForClient(appointmentId, user.id)
        if (!appointment) {
            return notFoundResponse(c)
        }

        if (appointment.status === 'upcoming') {
            return c.json(
                { error: 'AppointmentNotStarted', message: 'Appointment has not started yet.' },
                400,
            )
        }

        const { text, imageFileIds, audioFileIds } = c.req.valid('json')

        const hasText = typeof text === 'string' && text.trim() !== ''
        const hasImages = imageFileIds.length > 0
        const hasAudio = audioFileIds.length > 0

        if (!hasText && !hasImages && !hasAudio) {
            return c.json(
                {
                    error: 'BadRequest',
                    message: 'At least one of text, imageFileIds, or audioFileIds is required.',
                },
                400,
            )
        }

        const impression = await createAttachment({
            appointmentId,
            authorId: user.id,
            type: 'impression',
            name: null,
            text: hasText ? text!.trim() : null,
            imageFileIds,
            audioFileIds,
        })

        return c.json({ impression }, 201)
    },
)

const completeSchema = z.object({
    response: z.string().min(1),
})

impressionClientRoutes.patch(
    '/:attachmentId/complete',
    zValidator('json', completeSchema),
    async (c) => {
        const user = c.get('user')
        const appointmentId = c.req.param('appointmentId')
        const attachmentId = c.req.param('attachmentId')

        const appointment = await AppointmentsRepo.findByIdForClient(appointmentId, user.id)
        if (!appointment) {
            return notFoundResponse(c)
        }

        const attachment = await findAndValidateAttachment(
            attachmentId,
            appointmentId,
            'impression',
            user.id,
        )
        if (!attachment) {
            return notFoundResponse(c)
        }

        const existing = await findImpressionCompletion(attachmentId)
        if (existing) {
            return c.json(
                {
                    error: 'AlreadyCompleted',
                    message: 'This impression has already been completed.',
                },
                400,
            )
        }

        const { response } = c.req.valid('json')
        const completion = await completeImpression(attachmentId, response)
        return c.json({ completion }, 200)
    },
)

impressionClientRoutes.get('/:attachmentId/completion', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const attachmentId = c.req.param('attachmentId')

    const appointment = await AppointmentsRepo.findByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return notFoundResponse(c)
    }

    const attachment = await findAndValidateAttachment(attachmentId, appointmentId, 'impression')
    if (!attachment) {
        return notFoundResponse(c)
    }

    const completion = await findImpressionCompletion(attachmentId)
    return c.json({ completion }, 200)
})

impressionClientRoutes.get('/', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await AppointmentsRepo.findByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return notFoundResponse(c)
    }

    const impressions = await listAttachmentsByAuthor(appointmentId, 'impression', user.id)
    return c.json({ impressions }, 200)
})
