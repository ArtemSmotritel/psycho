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
}

export interface CreateAppointmentDTO {
    startTime: string
    endTime: string
    generateGoogleMeet: boolean
}

export interface UpdateAppointmentDTO {
    startTime?: string
    endTime?: string
    googleMeetLink?: string | null
    rescheduleGoogleMeet?: boolean
}
