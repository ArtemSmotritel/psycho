import { api } from './api'
import type {
    AcceptInvitationResponse,
    CreateInvitationResponse,
    Invitation,
} from '~/models/invitation'

export const invitationService = {
    create: (email: string) => api.post<CreateInvitationResponse>('/invitations', { email }),

    list: () => api.get<{ invitations: Invitation[] }>('/invitations'),

    remove: (id: string) => api.delete(`/invitations/${id}`),

    accept: (token: string) => api.post<AcceptInvitationResponse>('/invitations/accept', { token }),
}
