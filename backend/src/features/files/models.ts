export interface FileEntity {
    id: string
    originalName: string
    storedName: string
    mimeType: string
    size: number
    uploadedBy: string
    createdAt: string
}

export interface UploadedFile {
    id: string
    url: string
    originalName: string
    mimeType: string
    size: number
    uploadedAt: string
}
