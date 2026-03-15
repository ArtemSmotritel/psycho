export interface FileUploadResponse {
    id: string
    url: string
    originalName: string
    mimeType: string
    size: number
    uploadedAt: string
}

export interface FileDeleteResponse {
    success: boolean
    message?: string
}
