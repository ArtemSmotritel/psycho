import { api } from './api'

interface CreateInvitationResponse {
    id: string
    token: string
    invitedEmail: string
    status: string
    expiresAt: string
    inviteLink: string
}

interface AcceptInvitationResponse {
    psychologistId: string
    clientId: string
}

export const invitationService = {
    create: (email: string) => api.post<CreateInvitationResponse>('/invitations', { email }),

    accept: (token: string) => api.post<AcceptInvitationResponse>('/invitations/accept', { token }),
}
