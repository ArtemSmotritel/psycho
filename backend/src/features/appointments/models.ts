export interface Appointment {
    id: string
    psychoId: string
    clientId: string
    startTime: string // ISO 8601
    endTime: string // ISO 8601
    startedAt: string | null // actual start timestamp
    endedAt: string | null // actual end timestamp
    status: 'upcoming' | 'active' | 'past' | 'warning' | 'missed'
    googleMeetLink: string | null
    googleCalendarEventId: string | null
    whiteboardSnapshotUrl: string | null
    createdAt: string
}

export interface AppointmentWithPsycho extends Appointment {
    psychoName: string
}

export interface AppointmentWithClient extends Appointment {
    clientName: string
}
