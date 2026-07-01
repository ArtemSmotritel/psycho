export type NotificationType = 'session_reminder' | 'rec_reminder' | 'rec_created'

export type Variant = '24h' | '1h' | '2d' | '1d'

export type OutboxStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface OutboxRow {
    id: string
    type: NotificationType
    variant: Variant | null
    recipientUserId: string
    appointmentId: string | null
    attachmentId: string | null
    status: OutboxStatus
    attempts: number
    lastError: string | null
    scheduledFor: string
    createdAt: string
    sentAt: string | null
}

export interface EnqueueParams {
    type: NotificationType
    recipientUserId: string
    appointmentId?: string | null
    attachmentId?: string | null
    variant?: Variant | null
    scheduledFor?: string | null
}

export interface OutboxContext {
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
