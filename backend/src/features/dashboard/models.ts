import type { AppointmentWithClient, AppointmentWithPsycho } from '../appointments/models'
import type { AttachmentWithReaction } from '../attachments/models'
import type { Client, PsychologistSummary } from '../clients/models'

export interface AppointmentCounts {
    upcoming: number
    past: number
    active: number
}

export interface PsychoDashboardData {
    totalClients: number
    totalUpcomingAppointments: number
    totalPastAppointments: number
    activeAppointment: AppointmentWithClient | null
    upcomingAppointments: AppointmentWithClient[]
    recentClients: Client[]
}

export interface ClientDashboardData {
    psychologists: PsychologistSummary[]
    activeAppointment: AppointmentWithPsycho | null
    nextAppointment: AppointmentWithPsycho | null
    pendingRecommendations: AttachmentWithReaction[]
    appointmentCounts: AppointmentCounts
}
