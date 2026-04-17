export interface AssociativeImage {
    id: string
    name: string
    imageUrl: string
    fileId: string
    createdAt: string
    updatedAt: string
}

export interface CreateAssociativeImageDTO {
    name: string
    fileId: string
}

export interface UpdateAssociativeImageDTO {
    name: string
}
