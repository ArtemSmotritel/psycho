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
