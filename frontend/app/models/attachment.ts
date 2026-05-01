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

export interface UpdateNoteDTO {
    name?: string
    text?: string
    removeFileIds?: string[]
}

export interface UpdateRecommendationDTO {
    name?: string
    text?: string
    removeFileIds?: string[]
}

export type CreateAttachmentPsychoDTO =
    | {
          type: 'note'
          name: string
          text?: string
          imageFileIds: string[]
          audioFileIds: string[]
      }
    | {
          type: 'recommendation'
          name: string
          text?: string
          imageFileIds: string[]
          audioFileIds: string[]
      }

export interface CreateAttachmentClientDTO {
    type: 'impression'
    name?: string
    text?: string
    imageFileIds: string[]
    audioFileIds: string[]
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
    appointmentStartTime: string
}

export interface UpsertReactionDTO {
    done?: boolean
    comment?: string
}

export interface SetReplyDTO {
    reply: string
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

export interface CompleteImpressionDTO {
    response: string
}
