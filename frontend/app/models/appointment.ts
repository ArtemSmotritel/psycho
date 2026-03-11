export interface Appointment {
    id: string
    clientId: string
    psychoId: string
    startTime: string
    endTime: string
    status: 'upcoming' | 'active' | 'past'
    googleMeetLink: string | null
    createdAt: string
}

export interface AppointmentWithPsycho extends Appointment {
    psychoName: string
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
}
