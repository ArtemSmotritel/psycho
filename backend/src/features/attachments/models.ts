export type AttachmentType = 'note' | 'impression' | 'recommendation'

export interface AttachmentFile {
    id: string
    url: string
    originalName: string
    mimeType: string
    size: number
}

export interface Attachment {
    id: string
    appointmentId: string
    authorId: string
    type: AttachmentType
    name: string | null
    text: string | null
    imageFiles: AttachmentFile[]
    audioFiles: AttachmentFile[]
    createdAt: string
    updatedAt: string
}

export interface RecommendationReaction {
    attachmentId: string
    done: boolean
    clientComment: string | null
    psychologistReply: string | null
    updatedAt: string
}

export interface AttachmentWithReaction extends Attachment {
    reaction: RecommendationReaction | null
}

export interface AttachmentWithAppointment extends Attachment {
    appointmentStartTime: string // ISO timestamp from appointments.start_time
}

export interface ImpressionCompletion {
    attachmentId: string
    clientResponse: string
    createdAt: string
}

export interface AttachmentWithCompletion extends Attachment {
    completion: ImpressionCompletion | null
}

export interface PsychoAttachmentList {
    notes: Attachment[]
    impressions: AttachmentWithCompletion[]
    recommendations: AttachmentWithReaction[]
}

export interface ClientAttachmentList {
    impressions: AttachmentWithCompletion[]
    recommendations: AttachmentWithReaction[]
}

export interface ProgressSession {
    id: string
    startTime: string
    endTime: string
    status: 'active' | 'past'
    impressions: Attachment[]
    recommendations: AttachmentWithReaction[]
}
