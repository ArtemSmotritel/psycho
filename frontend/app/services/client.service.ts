import { api } from './api'
import type { Client, ClientListItem, ClientSummary } from '~/models/client'

export const clientService = {
    addByEmailForPsycho: (email: string) =>
        api.post<{ client: ClientSummary }>('/clients', { email }),

    getListForPsycho: () => api.get<{ clients: ClientListItem[] }>('/clients'),

    getByIdForPsycho: (id: string) => api.get<{ client: Client }>(`/clients/${id}`),

    updateForPsycho: (id: string, data: Partial<Client>) =>
        api.put<{ client: Client }>(`/clients/${id}`, data),

    deleteForPsycho: (id: string) => api.delete(`/clients/${id}`),

    getMeForClient: () => api.get<{ client: Client }>('/clients/me'),

    updateMeForClient: (
        data: Partial<Pick<Client, 'name' | 'username' | 'phone' | 'telegram' | 'instagram'>>,
    ) => api.put<{ client: Client }>('/clients/me', data),
}
