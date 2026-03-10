import { api } from './api'
import type { Client } from '~/models/client'

export const clientService = {
    addByEmail: (email: string) => api.post<{ client: Client }>('/clients', { email }),

    getList: () => api.get<{ clients: Client[] }>('/clients'),

    getById: (id: string) => api.get<{ client: Client }>(`/clients/${id}`),

    update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),

    getSessions: (clientId: string, params?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
        api.get(`/clients/${clientId}/sessions`, { params }),

    getProgress: (clientId: string) => api.get(`/clients/${clientId}/progress`),
}
