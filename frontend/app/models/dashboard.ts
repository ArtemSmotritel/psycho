import type { Client } from './client'
import type { AppointmentWithClient, AppointmentWithPsycho } from './appointment'
import type { AttachmentWithReaction } from './attachment'

export interface PsychoDashboard {
    totalClients: number
    totalUpcomingAppointments: number
    totalPastAppointments: number
    activeAppointment: AppointmentWithClient | null
    upcomingAppointments: AppointmentWithClient[]
    recentClients: Client[]
}

export interface ClientPsychologist {
    id: string
    name: string
    email: string
    image: string | null
}

export interface ClientDashboardData {
    psychologists: ClientPsychologist[]
    activeAppointment: AppointmentWithPsycho | null
    nextAppointment: AppointmentWithPsycho | null
    pendingRecommendations: AttachmentWithReaction[]
    appointmentCounts: {
        upcoming: number
        active: number
        past: number
    }
}
