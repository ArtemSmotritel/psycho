import { api } from './api'
import type { Client } from '~/models/client'

export const clientService = {
    addByEmail: (email: string) =>
        api.post<{ client: Client }>(
            '/clients',
            { email },
            {
                headers: { 'Helpsycho-User-Role': 'psycho' },
            },
        ),

    getList: () =>
        api.get<{ clients: Client[] }>('/clients', {
            headers: { 'Helpsycho-User-Role': 'psycho' },
        }),

    update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),

    getById: (id: string) => api.get<Client>(`/clients/${id}`),

    getSessions: (clientId: string, params?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
        api.get(`/clients/${clientId}/sessions`, { params }),

    getProgress: (clientId: string) => api.get(`/clients/${clientId}/progress`),
}
