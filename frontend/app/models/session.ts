import type { Attachment, AttachmentWithReaction } from './attachment'
import type { Appointment } from './appointment'

export interface Session extends Appointment {
    notes: Attachment[]
    recommendations: AttachmentWithReaction[]
    impressions: Attachment[]
}
