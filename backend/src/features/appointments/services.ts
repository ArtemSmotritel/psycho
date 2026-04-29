import { BadGatewayError, BadRequestError, ConflictError, NotFoundError } from 'errors/index'
import { log } from 'utils/logger'
import {
    deleteGoogleCalendarEvent,
    generateGoogleMeetLink,
    rescheduleGoogleCalendarEvent,
} from 'utils/google-meet'
import { ClientsRepo } from '../clients/repo'
import { WhiteboardService } from '../whiteboard/services'
import type { Appointment, AppointmentWithClient, AppointmentWithPsycho } from './models'
import { AppointmentsRepo } from './repo'

export interface CreateAppointmentInput {
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    generateGoogleMeet?: boolean
}

export interface UpdateAppointmentInput {
    startTime?: string
    endTime?: string
    googleMeetLink?: string | null
    rescheduleGoogleMeet?: boolean
}

export interface CreateAppointmentResult {
    appointment: Appointment
    meetLinkGenerationFailed: boolean
}

export interface UpdateAppointmentResult {
    appointment: Appointment
    meetRescheduleFailed: boolean
}

export interface DeleteAppointmentResult {
    success: true
    meetDeleteFailed?: true
}

const ensureEndAfterStart = (startTime: string, endTime: string) => {
    if (new Date(endTime) <= new Date(startTime)) {
        throw new BadRequestError('endTime must be after startTime')
    }
}

const ensureLinked = async (psychoId: string, clientId: string) => {
    const linked = await ClientsRepo.isLinkedToPsycho(clientId, psychoId)
    if (!linked) {
        throw new BadRequestError('This client is not in your list.', 'ClientNotLinked')
    }
}

const throwIfOverlapping = async (params: {
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    excludeAppointmentId?: string
}) => {
    const conflict = await AppointmentsRepo.findOverlapping(params)
    if (conflict) {
        throw new ConflictError(
            'An appointment overlapping this time range already exists.',
            'AppointmentConflict',
            {
                conflictingAppointmentId: conflict.id,
                conflictParticipant: conflict.conflictParticipant,
            },
        )
    }
}

export const AppointmentsService = {
    async listForPsycho(psychoId: string, clientId: string): Promise<Appointment[]> {
        await ensureLinked(psychoId, clientId)
        return AppointmentsRepo.listForPsychoClient(psychoId, clientId)
    },

    async listForClient(clientId: string): Promise<AppointmentWithPsycho[]> {
        return AppointmentsRepo.listForClient(clientId)
    },

    async listAllForPsycho(psychoId: string): Promise<AppointmentWithClient[]> {
        return AppointmentsRepo.listAllForPsycho(psychoId)
    },

    async getActiveForPsycho(psychoId: string): Promise<Appointment | null> {
        return AppointmentsRepo.findActiveByPsycho(psychoId)
    },

    async getForPsycho(
        appointmentId: string,
        psychoId: string,
        clientId: string,
    ): Promise<Appointment> {
        const appointment = await AppointmentsRepo.findByIdForPsycho(
            appointmentId,
            psychoId,
            clientId,
        )
        if (!appointment) throw new NotFoundError()
        return appointment
    },

    async getForClient(appointmentId: string, clientId: string): Promise<AppointmentWithPsycho> {
        const appointment = await AppointmentsRepo.findByIdForClient(appointmentId, clientId)
        if (!appointment) throw new NotFoundError()
        return appointment
    },

    async startForPsycho(
        appointmentId: string,
        psychoId: string,
        clientId: string,
    ): Promise<Appointment> {
        const existing = await AppointmentsRepo.findByIdForPsycho(appointmentId, psychoId, clientId)
        if (!existing) throw new NotFoundError()

        if (existing.status !== 'upcoming' && existing.status !== 'warning') {
            throw new BadRequestError(
                'Only upcoming or warning appointments can be started.',
                'AppointmentNotStartable',
            )
        }

        const active = await AppointmentsRepo.findActiveByPsycho(psychoId)
        if (active) {
            throw new BadRequestError(
                'End your active appointment before starting a new one.',
                'AnotherAppointmentActive',
                { activeAppointmentId: active.id },
            )
        }

        return AppointmentsRepo.markStarted(appointmentId)
    },

    async endForPsycho(
        appointmentId: string,
        psychoId: string,
        clientId: string,
        snapshotDataUrl: string | null,
    ): Promise<Appointment> {
        const existing = await AppointmentsRepo.findByIdForPsycho(appointmentId, psychoId, clientId)
        if (!existing) throw new NotFoundError()

        if (existing.startedAt === null || existing.endedAt !== null) {
            throw new BadRequestError(
                'Only active appointments can be ended.',
                'AppointmentNotEndable',
            )
        }

        const appointment = await AppointmentsRepo.markEnded(appointmentId, snapshotDataUrl)

        // Clearing whiteboard state is best-effort: if it fails, the appointment
        // is still ended. Log and move on.
        await WhiteboardService.clearState(appointmentId).catch((err) => {
            log.warn('[Appointments] Failed to clear whiteboard state', { appointmentId, err })
        })

        return appointment
    },

    async createForPsycho(input: CreateAppointmentInput): Promise<CreateAppointmentResult> {
        const { psychoId, clientId, startTime, endTime, generateGoogleMeet } = input

        ensureEndAfterStart(startTime, endTime)
        await ensureLinked(psychoId, clientId)
        await throwIfOverlapping({ psychoId, clientId, startTime, endTime })

        // Insert the DB row first so the appointment exists even if the
        // Google call fails. Then call Google and patch the row with the
        // returned link/eventId. Not transactional on purpose — a 3rd-party
        // call inside a DB transaction would hold locks across network I/O.
        let appointment = await AppointmentsRepo.insert({
            psychoId,
            clientId,
            startTime,
            endTime,
            googleMeetLink: null,
            googleCalendarEventId: null,
        })

        let meetLinkGenerationFailed = false
        if (generateGoogleMeet === true) {
            const result = await generateGoogleMeetLink(psychoId, clientId, startTime, endTime)
            if (result.link === null) {
                meetLinkGenerationFailed = true
            } else {
                try {
                    appointment = await AppointmentsRepo.updateGoogleFields(appointment.id, {
                        googleMeetLink: result.link,
                        googleCalendarEventId: result.eventId,
                    })
                } catch (err) {
                    if (result.eventId) {
                        await deleteGoogleCalendarEvent(psychoId, result.eventId).catch(
                            (cleanupErr) =>
                                log.error(
                                    '[Appointments] Failed to clean up orphan Calendar event after DB update failure',
                                    {
                                        psychoId,
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

        return { appointment, meetLinkGenerationFailed }
    },

    async updateForPsycho(
        appointmentId: string,
        psychoId: string,
        clientId: string,
        input: UpdateAppointmentInput,
    ): Promise<UpdateAppointmentResult> {
        const existing = await AppointmentsRepo.findByIdForPsycho(appointmentId, psychoId, clientId)
        if (!existing) throw new NotFoundError()

        if (existing.status !== 'upcoming') {
            throw new BadRequestError(
                'Only upcoming appointments can be edited.',
                'AppointmentNotEditable',
            )
        }

        const mergedStart = input.startTime ?? existing.startTime
        const mergedEnd = input.endTime ?? existing.endTime
        let mergedLink =
            input.googleMeetLink !== undefined ? input.googleMeetLink : existing.googleMeetLink
        let mergedCalendarEventId = existing.googleCalendarEventId

        ensureEndAfterStart(mergedStart, mergedEnd)
        await throwIfOverlapping({
            psychoId,
            clientId: existing.clientId,
            startTime: mergedStart,
            endTime: mergedEnd,
            excludeAppointmentId: appointmentId,
        })

        let meetRescheduleFailed = false
        if (input.rescheduleGoogleMeet === true) {
            if (existing.googleCalendarEventId) {
                const success = await rescheduleGoogleCalendarEvent(
                    psychoId,
                    existing.googleCalendarEventId,
                    mergedStart,
                    mergedEnd,
                )
                if (!success) {
                    // Refuse to let DB and Google Calendar diverge: abort the
                    // update rather than silently shipping the new times only
                    // to our own DB while the calendar invite retains the old ones.
                    throw new BadGatewayError(
                        'Could not update Google Calendar event; appointment time not changed.',
                        'MeetRescheduleFailed',
                        { googleCalendarEventId: existing.googleCalendarEventId },
                    )
                }
            } else {
                const result = await generateGoogleMeetLink(
                    psychoId,
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

        const appointment = await AppointmentsRepo.update(appointmentId, {
            startTime: mergedStart,
            endTime: mergedEnd,
            googleMeetLink: mergedLink,
            googleCalendarEventId: mergedCalendarEventId,
        })

        // TODO: EDG-58 — send rescheduled email to client if startTime or endTime changed

        return { appointment, meetRescheduleFailed }
    },

    async deleteForPsycho(
        appointmentId: string,
        psychoId: string,
        clientId: string,
    ): Promise<DeleteAppointmentResult> {
        const existing = await AppointmentsRepo.findByIdForPsycho(appointmentId, psychoId, clientId)
        if (!existing) throw new NotFoundError()

        if (existing.status !== 'upcoming') {
            throw new BadRequestError(
                'Only upcoming appointments can be deleted.',
                'AppointmentNotDeletable',
            )
        }

        let meetDeleteFailed = false
        if (existing.googleCalendarEventId) {
            const success = await deleteGoogleCalendarEvent(
                psychoId,
                existing.googleCalendarEventId,
            )
            if (!success) {
                meetDeleteFailed = true
            }
        }

        await AppointmentsRepo.deleteById(appointmentId)

        // TODO: EDG-57 — send appointment deleted email to client

        const response: DeleteAppointmentResult = { success: true }
        if (meetDeleteFailed) {
            response.meetDeleteFailed = true
        }
        return response
    },
} as const
