import type { Attachment, AttachmentWithReaction } from './attachment'

export interface ProgressSession {
    id: string
    startTime: string
    endTime: string
    status: 'active' | 'past'
    impressions: Attachment[]
    recommendations: AttachmentWithReaction[]
}
