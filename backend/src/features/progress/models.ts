import type { Attachment, AttachmentWithReaction } from '../attachments/models'

export interface AttachmentWithAppointment extends Attachment {
    appointmentStartTime: string
}

export interface ProgressSession {
    id: string
    startTime: string
    endTime: string
    status: 'active' | 'past'
    impressions: Attachment[]
    recommendations: AttachmentWithReaction[]
}
