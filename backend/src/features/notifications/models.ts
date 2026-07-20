export type NotificationType =
    'session_reminder' | 'rec_reminder' | 'rec_created' | 'invitation_created'

export type Variant = '24h' | '1h' | '2d' | '1d'

export type OutboxStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface OutboxRow {
    id: string
    type: NotificationType
    variant: Variant | null
    recipientUserId: string | null
    recipientEmail: string | null
    appointmentId: string | null
    attachmentId: string | null
    invitationId: string | null
    status: OutboxStatus
    attempts: number
    lastError: string | null
    scheduledFor: string
    createdAt: string
    sentAt: string | null
}

export interface EnqueueParams {
    type: NotificationType
    recipientUserId?: string | null
    recipientEmail?: string | null
    appointmentId?: string | null
    attachmentId?: string | null
    invitationId?: string | null
    variant?: Variant | null
    scheduledFor?: string | null
}

/** Context for the appointment-bound types (session_reminder, rec_reminder, rec_created). */
export interface AppointmentEmailContext {
    id: string
    type: NotificationType
    variant: Variant | null
    recipientEmail: string
    recipientName: string | null
    recipientRole: 'psycho' | 'client'
    appointmentId: string | null
    appointmentStartTime: string | null
    appointmentStartedAt: string | null
    googleMeetLink: string | null
}

/** Context for invitation_created — the recipient is a raw email with no user row. */
export interface InvitationEmailContext {
    id: string
    recipientEmail: string
    psychoName: string | null
    token: string
    invitationStatus: string
}
