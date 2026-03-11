export interface Appointment {
    id: string
    psychoId: string
    clientId: string
    startTime: string // ISO 8601
    endTime: string // ISO 8601
    status: 'upcoming' | 'active' | 'past'
    googleMeetLink: string | null
    createdAt: string
}

export interface AppointmentWithPsycho extends Appointment {
    psychoName: string
}
