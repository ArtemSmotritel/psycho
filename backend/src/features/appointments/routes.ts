import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import {
    deleteGoogleCalendarEvent,
    generateGoogleMeetLink,
    rescheduleGoogleCalendarEvent,
} from '../../utils/google-meet'
import { log } from 'utils/logger'
import {
    createAppointment,
    deleteAppointment,
    endAppointmentWithSnapshot,
    findActiveAppointmentByPsycho,
    findAppointmentById,
    findOverlappingAppointment,
    listAppointments,
    setAppointmentGoogleFields,
    startAppointment,
    updateAppointment,
} from './services'
import { isClientLinkedToPsycho } from '../clients/services'
import { clearWhiteboardState } from '../whiteboard/services'

const createAppointmentSchema = z.object({
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
    generateGoogleMeet: z.boolean().optional(),
    fromRequestId: z.string().optional(),
    acknowledgePingConflict: z.boolean().optional(),
})

const updateAppointmentSchema = z.object({
    startTime: z.iso.datetime({ offset: true }).optional(),
    endTime: z.iso.datetime({ offset: true }).optional(),
    googleMeetLink: z.url().nullable().optional(),
    rescheduleGoogleMeet: z.boolean().optional(),
    acknowledgePingConflict: z.boolean().optional(),
})

const endAppointmentSchema = z.object({
    snapshotDataUrl: z
        .string()
        .max(2_800_000, {
            message: 'snapshotDataUrl exceeds the 2 MB limit',
        })
        .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, {
            message: 'snapshotDataUrl must be a PNG, JPEG, or WebP base64 data URL',
        })
        .optional(),
})

export const appointmentRoutes = new Hono()

appointmentRoutes.use(authorized, onlyPsychoRequest).get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')

    const linked = await isClientLinkedToPsycho(clientId, user.id)
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

        const linked = await isClientLinkedToPsycho(clientId, user.id)
        if (!linked) {
            return c.json(
                { error: 'ClientNotLinked', message: 'This client is not in your list.' },
                400,
            )
        }

        const conflict = await findOverlappingAppointment({
            psychoId: user.id,
            clientId,
            startTime,
            endTime,
        })
        if (conflict) {
            return c.json(
                {
                    error: 'AppointmentConflict',
                    message: 'An appointment overlapping this time range already exists.',
                    conflictingAppointmentId: conflict.id,
                    conflictParticipant: conflict.conflictParticipant,
                },
                409,
            )
        }

        // Insert the DB row first so the appointment exists even if the
        // Google call fails. Then call Google and patch the row with the
        // returned link/eventId. Not transactional on purpose — a 3rd-party
        // call inside a DB transaction would hold locks across network I/O.
        let appointment = await createAppointment({
            psychoId: user.id,
            clientId,
            startTime,
            endTime,
            googleMeetLink: null,
            googleCalendarEventId: null,
        })

        let meetLinkGenerationFailed = false
        if (generateGoogleMeet === true) {
            const result = await generateGoogleMeetLink(user.id, clientId, startTime, endTime)
            if (result.link === null) {
                meetLinkGenerationFailed = true
            } else {
                try {
                    appointment = await setAppointmentGoogleFields(appointment.id, {
                        googleMeetLink: result.link,
                        googleCalendarEventId: result.eventId,
                    })
                } catch (err) {
                    if (result.eventId) {
                        await deleteGoogleCalendarEvent(user.id, result.eventId).catch(
                            (cleanupErr) =>
                                log.error(
                                    '[Appointments] Failed to clean up orphan Calendar event after DB update failure',
                                    {
                                        psychoId: user.id,
                                        googleCalendarEventId: result.eventId,
                                        cleanupErr,
                                    },
                                ),
                        )
                    }
                    throw err
                }
            }
        }

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

        const conflict = await findOverlappingAppointment({
            psychoId: user.id,
            clientId: existing.clientId,
            startTime: mergedStart,
            endTime: mergedEnd,
            excludeAppointmentId: appointmentId,
        })
        if (conflict) {
            return c.json(
                {
                    error: 'AppointmentConflict',
                    message: 'An appointment overlapping this time range already exists.',
                    conflictingAppointmentId: conflict.id,
                    conflictParticipant: conflict.conflictParticipant,
                },
                409,
            )
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
                    // Refuse to let DB and Google Calendar diverge: abort the
                    // update rather than silently shipping the new times only
                    // to our own DB while the calendar invite retains the old ones.
                    return c.json(
                        {
                            error: 'MeetRescheduleFailed',
                            message:
                                'Could not update Google Calendar event; appointment time not changed.',
                            googleCalendarEventId: existing.googleCalendarEventId,
                        },
                        502,
                    )
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

    let meetDeleteFailed = false
    if (existing.googleCalendarEventId) {
        const success = await deleteGoogleCalendarEvent(user.id, existing.googleCalendarEventId)
        if (!success) {
            meetDeleteFailed = true
        }
    }

    await deleteAppointment(appointmentId)

    // TODO: EDG-57 — send appointment deleted email to client

    const response: { success: true; meetDeleteFailed?: true } = { success: true }
    if (meetDeleteFailed) {
        response.meetDeleteFailed = true
    }
    return c.json(response, 200)
})
