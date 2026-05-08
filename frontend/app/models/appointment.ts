export interface Appointment {
    id: string
    clientId: string
    psychoId: string
    startTime: string
    endTime: string
    startedAt: string | null
    endedAt: string | null
    status: 'upcoming' | 'active' | 'past' | 'warning' | 'missed'
    googleMeetLink: string | null
    whiteboardSnapshotUrl: string | null
    createdAt: string
}

export interface AppointmentWithPsycho extends Appointment {
    psychoName: string
}

export interface AppointmentWithClient extends Appointment {
    clientName: string
    notesCount: number
    impressionsCount: number
    recommendationsCount: number
}

export interface CreateAppointmentDTO {
    startTime: string
    endTime: string
    generateGoogleMeet: boolean
    // `fromRequestId` and `acknowledgePingConflict` belong to the
    // ping-for-session feature (docs/feature-3-implementation-plan.md). The
    // backend currently accepts both in the schema but ignores them; they are
    // unused on the wire until Feature 3 lands.
    fromRequestId?: string
    acknowledgePingConflict?: boolean
}

export interface UpdateAppointmentDTO {
    startTime?: string
    endTime?: string
    googleMeetLink?: string | null
    rescheduleGoogleMeet?: boolean
    // See note on CreateAppointmentDTO — ping-for-session is not yet
    // implemented on the backend, so this field is dormant.
    acknowledgePingConflict?: boolean
}
