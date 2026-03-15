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
