import { api } from './api'
import type { ClientDashboardData, DashboardStatistics } from '~/models/dashboard'

export const dashboardService = {
    getStatistics: () => api.get<DashboardStatistics>('/dashboard/statistics'),
    getClientDashboard: () => api.get<ClientDashboardData>('/client/dashboard'),
}
