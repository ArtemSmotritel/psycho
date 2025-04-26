import { api } from './api';
import type { Client } from '~/models/client';

export const clientService = {
  create: (data: Omit<Client, 'id'>) => 
    api.post<Client>('/clients', data),

  update: (id: string, data: Partial<Client>) => 
    api.put<Client>(`/clients/${id}`, data),

  getList: (params?: { sortBy?: string; sortOrder?: 'asc' | 'desc'; filterToday?: boolean }) => 
    api.get<Client[]>('/clients', { params }),

  getById: (id: string) => 
    api.get<Client>(`/clients/${id}`),

  getSessions: (clientId: string, params?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }) => 
    api.get(`/clients/${clientId}/sessions`, { params }),

  getProgress: (clientId: string) => 
    api.get(`/clients/${clientId}/progress`),
}; 