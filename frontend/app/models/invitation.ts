export interface Invitation {
    id: string
    invitedEmail: string
    token: string
    status: 'pending' | 'accepted'
    createdAt: string
    inviteLink: string
}

export interface CreateInvitationResponse extends Invitation {}

export interface AcceptInvitationResponse {
    psychologistId: string
    clientId: string
}
