import { ClientsRepo } from '../clients/repo'
import type { AppointmentCounts, ClientDashboardData, PsychoDashboardData } from './models'
import { DashboardRepo } from './repo'

// 'warning' rolls into 'upcoming' (scheduled, window arrived but not started).
// 'missed' rolls into 'past' (window elapsed without being started).
// Post-B2, overrun sessions remain 'active' until explicitly ended.
function rollupStatuses(rows: Array<{ status: string; count: number }>): AppointmentCounts {
    let upcoming = 0
    let past = 0
    let active = 0
    for (const row of rows) {
        const count = Number(row.count)
        if (row.status === 'upcoming' || row.status === 'warning') upcoming += count
        else if (row.status === 'past' || row.status === 'missed') past += count
        else if (row.status === 'active') active += count
    }
    return { upcoming, past, active }
}

export const DashboardService = {
    async getForPsycho(psychoId: string): Promise<PsychoDashboardData> {
        const [
            totalClients,
            totalUpcomingAppointments,
            totalPastAppointments,
            upcomingAppointments,
            activeAppointment,
            recentClients,
        ] = await Promise.all([
            DashboardRepo.countActiveClientsForPsycho(psychoId),
            DashboardRepo.countUpcomingAppointmentsForPsycho(psychoId),
            DashboardRepo.countPastAppointmentsForPsycho(psychoId),
            DashboardRepo.listUpcomingAppointmentsWithClient(psychoId, 5),
            DashboardRepo.findActiveAppointmentWithClient(psychoId),
            DashboardRepo.listRecentClientsForPsycho(psychoId, 5),
        ])

        return {
            totalClients,
            totalUpcomingAppointments,
            totalPastAppointments,
            activeAppointment,
            upcomingAppointments,
            recentClients,
        }
    },

    async getForClient(clientId: string): Promise<ClientDashboardData> {
        const [
            psychologists,
            activeAppointment,
            nextAppointment,
            pendingRecommendations,
            statusRows,
        ] = await Promise.all([
            ClientsRepo.listPsychologistsForClient(clientId),
            DashboardRepo.findActiveAppointmentWithPsycho(clientId),
            DashboardRepo.findNextAppointmentWithPsycho(clientId),
            DashboardRepo.listPendingRecommendationsForClient(clientId),
            DashboardRepo.countAppointmentsByStatusForClient(clientId),
        ])

        return {
            psychologists,
            activeAppointment,
            nextAppointment,
            pendingRecommendations,
            appointmentCounts: rollupStatuses(statusRows),
        }
    },
} as const
