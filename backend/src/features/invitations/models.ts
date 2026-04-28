export interface Invitation {
    id: string
    psychologistId: string
    invitedEmail: string
    token: string
    status: 'pending' | 'accepted'
    createdAt: string
    inviteLink?: string
}
