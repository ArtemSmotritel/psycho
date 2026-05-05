import { api } from './api'
import type {
    AcceptInvitationResponse,
    CreateInvitationResponse,
    Invitation,
} from '~/models/invitation'

export const invitationService = {
    createForPsycho: (email: string) =>
        api.post<CreateInvitationResponse>('/invitations', { email }),

    listForPsycho: () => api.get<{ invitations: Invitation[] }>('/invitations'),

    deleteForPsycho: (id: string) => api.delete(`/invitations/${id}`),

    accept: (token: string) => api.post<AcceptInvitationResponse>('/invitations/accept', { token }),
}
