import type { Session } from './session';
import type { Client } from './client';

export interface SessionDistribution {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

export interface ClientActivity {
  activeClients: number;
  newClients: number;
  inactiveClients: number;
}

export interface DashboardStatistics {
  totalClients: number;
  totalSessions: number;
  upcomingSessions: Session[];
  recentClients: Client[];
  sessionDistribution: SessionDistribution;
  clientActivity: ClientActivity;
} 