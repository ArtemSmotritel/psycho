import { api } from './api';
import type { DashboardStatistics } from '~/models/dashboard';

export const dashboardService = {
  getStatistics: () => 
    api.get<DashboardStatistics>('/dashboard/statistics'),
}; 