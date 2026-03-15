export type AttachmentType = 'note' | 'impression' | 'recommendation'

export interface Attachment {
    id: string
    appointmentId: string
    authorId: string
    type: AttachmentType
    name: string | null
    text: string | null
    imageUrls: string[]
    audioUrls: string[]
    createdAt: string
    updatedAt: string
}

export interface CreateNoteDTO {
    name: string
    text?: string
    imageUrls?: string[]
    audioUrls?: string[]
}

export interface UpdateNoteDTO {
    name?: string
    text?: string
    // no media fields — locked after creation
}
