import { api } from './api'
import type { Client } from '~/models/client'

export const clientService = {
    addByEmail: (email: string) => api.post<{ client: Client }>('/clients', { email }),

    getList: () => api.get<{ clients: Client[] }>('/clients'),

    getById: (id: string) => api.get<{ client: Client }>(`/clients/${id}`),

    update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),

    remove: (id: string) => api.delete(`/clients/${id}`),

    getProgress: (clientId: string) => api.get(`/clients/${clientId}/progress`),

    getMe: () => api.get<{ client: Client }>('/clients/me'),

    updateMe: (
        data: Partial<Pick<Client, 'name' | 'username' | 'phone' | 'telegram' | 'instagram'>>,
    ) => api.put<{ client: Client }>('/clients/me', data),
}
