import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { generateGoogleMeetLink, rescheduleGoogleCalendarEvent } from '../../utils/google-meet'
import {
    createAppointment,
    deleteAppointment,
    endAppointmentWithSnapshot,
    findActiveAppointmentByPsycho,
    findAppointmentById,
    isClientLinkedAndActive,
    listAppointments,
    startAppointment,
    updateAppointment,
} from './services'
import { clearWhiteboardState } from '../whiteboard/services'

const createAppointmentSchema = z.object({
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
    generateGoogleMeet: z.boolean().optional(),
})

const updateAppointmentSchema = z.object({
    startTime: z.iso.datetime({ offset: true }).optional(),
    endTime: z.iso.datetime({ offset: true }).optional(),
    googleMeetLink: z.url().nullable().optional(),
    rescheduleGoogleMeet: z.boolean().optional(),
})

const endAppointmentSchema = z.object({
    snapshotDataUrl: z
        .string()
        .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/, {
            message: 'snapshotDataUrl must be a base64-encoded image data URL',
        })
        .optional(),
})

export const appointmentRoutes = new Hono()

appointmentRoutes.use(authorized, onlyPsychoRequest).get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')

    const linked = await isClientLinkedAndActive(clientId, user.id)
    if (!linked) {
        return c.json(
            { error: 'ClientNotLinked', message: 'This client is not in your list.' },
            400,
        )
    }

    const appointments = await listAppointments(user.id, clientId)
    return c.json({ appointments }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).get('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const appointment = await findAppointmentById(appointmentId, user.id, clientId)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ appointment }, 200)
})

appointmentRoutes.use(authorized, onlyPsychoRequest).patch('/:appointmentId/start', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
    if (!existing) {
        return c.json({ error: 'NotFound' }, 404)
    }

    if (existing.status !== 'upcoming' && existing.status !== 'warning') {
        return c.json(
            {
                error: 'AppointmentNotStartable',
                message: 'Only upcoming or warning appointments can be started.',
            },
            400,
        )
    }

    const active = await findActiveAppointmentByPsycho(user.id)
    if (active) {
        return c.json(
            {
                error: 'AnotherAppointmentActive',
                message: 'End your active appointment before starting a new one.',
                activeAppointmentId: active.id,
            },
            400,
        )
    }

    const appointment = await startAppointment(appointmentId)
    return c.json({ appointment }, 200)
})

appointmentRoutes
    .use(authorized, onlyPsychoRequest)
    .patch('/:appointmentId/end', zValidator('json', endAppointmentSchema), async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const appointmentId = c.req.param('appointmentId')

        const existing = await findAppointmentById(appointmentId, user.id, clientId)
        if (!existing) {
            return c.json({ error: 'NotFound' }, 404)
        }

        if (existing.startedAt === null || existing.endedAt !== null) {
            return c.json(
                {
                    error: 'AppointmentNotEndable',
                    message: 'Only active appointments can be ended.',
                },
                400,
            )
        }

        const { snapshotDataUrl } = c.req.valid('json')

        const appointment = await endAppointmentWithSnapshot(appointmentId, snapshotDataUrl ?? null)

        // Clear persisted whiteboard state now that the appointment has ended
        await clearWhiteboardState(appointmentId).catch((err) => {
            console.warn('Failed to clear whiteboard state for appointment', appointmentId, err)
        })

        return c.json({ appointment }, 200)
    })

appointmentRoutes
    .use(authorized, onlyPsychoRequest)
    .post('/', zValidator('json', createAppointmentSchema), async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')

        const { startTime, endTime, generateGoogleMeet } = c.req.valid('json')

        if (new Date(endTime) <= new Date(startTime)) {
            return c.json({ error: 'BadRequest', message: 'endTime must be after startTime' }, 400)
        }

        const linked = await isClientLinkedAndActive(clientId, user.id)
        if (!linked) {
            return c.json(
                { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                400,
            )
        }

        let googleMeetLink: string | null = null
        let googleCalendarEventId: string | null = null
        let meetLinkGenerationFailed = false
        if (generateGoogleMeet === true) {
            const result = await generateGoogleMeetLink(user.id, clientId, startTime, endTime)
            googleMeetLink = result.link
            googleCalendarEventId = result.eventId
            if (googleMeetLink === null) {
                meetLinkGenerationFailed = true
            }
        }

        const appointment = await createAppointment({
            psychoId: user.id,
            clientId,
            startTime,
            endTime,
            googleMeetLink,
            googleCalendarEventId,
        })

        return c.json({ appointment, meetLinkGenerationFailed }, 201)
    })

appointmentRoutes
    .use(authorized, onlyPsychoRequest)
    .patch('/:appointmentId', zValidator('json', updateAppointmentSchema), async (c) => {
        const user = c.get('user')
        const clientId = c.req.param('clientId')
        const appointmentId = c.req.param('appointmentId')

        const body = c.req.valid('json')

        const existing = await findAppointmentById(appointmentId, user.id, clientId)
        if (!existing) {
            return c.json({ error: 'NotFound' }, 404)
        }

        if (existing.status !== 'upcoming') {
            return c.json(
                {
                    error: 'AppointmentNotEditable',
                    message: 'Only upcoming appointments can be edited.',
                },
                400,
            )
        }

        const mergedStart = body.startTime ?? existing.startTime
        const mergedEnd = body.endTime ?? existing.endTime
        let mergedLink =
            body.googleMeetLink !== undefined ? body.googleMeetLink : existing.googleMeetLink
        let mergedCalendarEventId = existing.googleCalendarEventId

        if (new Date(mergedEnd) <= new Date(mergedStart)) {
            return c.json({ error: 'BadRequest', message: 'endTime must be after startTime' }, 400)
        }

        const { rescheduleGoogleMeet } = body
        let meetRescheduleFailed = false

        if (rescheduleGoogleMeet === true) {
            if (existing.googleCalendarEventId) {
                const success = await rescheduleGoogleCalendarEvent(
                    user.id,
                    existing.googleCalendarEventId,
                    mergedStart,
                    mergedEnd,
                )
                if (!success) {
                    meetRescheduleFailed = true
                }
            } else {
                const result = await generateGoogleMeetLink(
                    user.id,
                    clientId,
                    mergedStart,
                    mergedEnd,
                )
                mergedLink = result.link ?? mergedLink
                mergedCalendarEventId = result.eventId
                if (result.link === null) {
                    meetRescheduleFailed = true
                }
            }
        }

        const appointment = await updateAppointment(appointmentId, {
            startTime: mergedStart,
            endTime: mergedEnd,
            googleMeetLink: mergedLink,
            googleCalendarEventId: mergedCalendarEventId,
        })

        // TODO: EDG-58 — send rescheduled email to client if startTime or endTime changed

        return c.json({ appointment, meetRescheduleFailed }, 200)
    })

appointmentRoutes.use(authorized, onlyPsychoRequest).delete('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
    if (!existing) {
        return c.json({ error: 'NotFound' }, 404)
    }

    if (existing.status !== 'upcoming') {
        return c.json(
            {
                error: 'AppointmentNotDeletable',
                message: 'Only upcoming appointments can be deleted.',
            },
            400,
        )
    }

    await deleteAppointment(appointmentId)

    // TODO: EDG-57 — send appointment deleted email to client

    return c.json({ success: true }, 200)
})
