import { format } from 'date-fns'
import { isAxiosError } from 'axios'
import type { Appointment } from '~/models/appointment'
import type { Attachment } from '~/models/attachment'

export function formatAppDate(date: Date | string) {
    if (typeof date === 'string') {
        return format(new Date(date), 'PPP HH:mm')
    }

    return format(date, 'PPP HH:mm')
}

const APPOINTMENT_CONFLICT_MESSAGES = {
    psycho: 'You already have an appointment that overlaps this time. Choose another time.',
    client: 'This client already has an appointment that overlaps this time. Choose another time.',
} as const

export function getAppointmentConflictMessage(err: unknown): string | null {
    if (
        !isAxiosError(err) ||
        err.response?.status !== 409 ||
        err.response.data?.error !== 'AppointmentConflict'
    ) {
        return null
    }

    const participant: unknown = err.response.data.conflictParticipant
    if (participant === 'psycho' || participant === 'client') {
        return APPOINTMENT_CONFLICT_MESSAGES[participant]
    }
    return 'An appointment overlaps this time. Choose another time.'
}

type AppointmentTimeRange = Pick<Appointment, 'startTime' | 'endTime'>

export function formatAppointmentTimeRange(a: AppointmentTimeRange): string {
    return `${format(new Date(a.startTime), 'HH:mm')} – ${format(new Date(a.endTime), 'HH:mm')}`
}

export function formatAppointmentDateTimeRange(a: AppointmentTimeRange): string {
    return `${format(new Date(a.startTime), 'PPp')} — ${format(new Date(a.endTime), 'p')}`
}

export const getAttachmentTypeLabel = (type: string) => {
    switch (type) {
        case 'note':
            return 'Note'
        case 'recommendation':
            return 'Recommendation'
        case 'impression':
            return 'Impression'
        default:
            return type
    }
}

export function formatAttachmentTitle(
    attachment: Pick<Attachment, 'name' | 'type' | 'createdAt'>,
): string {
    if (attachment.name) return attachment.name
    return `${getAttachmentTypeLabel(attachment.type)} — ${formatAppDate(attachment.createdAt)}`
}
