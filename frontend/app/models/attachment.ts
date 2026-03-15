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

export interface CreateNoteDTO {
    name: string
    text?: string
    imageFileIds?: string[]
    audioFileIds?: string[]
}

export interface UpdateNoteDTO {
    name?: string
    text?: string
    // no media fields — locked after creation
}

export interface CreateImpressionDTO {
    text?: string
    imageFileIds?: string[]
    audioFileIds?: string[]
}
