import { api } from './api'
import type { ClientDashboardData, PsychoDashboard } from '~/models/dashboard'

export const dashboardService = {
    getDashboardForPsycho: () => api.get<PsychoDashboard>('/psycho/dashboard'),
    getDashboardForClient: () => api.get<ClientDashboardData>('/client/dashboard'),
}
