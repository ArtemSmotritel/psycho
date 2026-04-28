export interface AssociativeImage {
    id: string
    psychologistId: string
    name: string
    fileId: string
    imageUrl: string
    createdAt: string
    updatedAt: string
}

export interface AssociativeImagesList {
    images: AssociativeImage[]
    total: number
}
