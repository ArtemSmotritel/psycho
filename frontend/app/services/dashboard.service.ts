import { api } from './api'
import type { ClientDashboardData, PsychoDashboard } from '~/models/dashboard'

export const dashboardService = {
    getPsychoDashboard: () => api.get<PsychoDashboard>('/psycho/dashboard'),
    getClientDashboard: () => api.get<ClientDashboardData>('/client/dashboard'),
}
