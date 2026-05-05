import { api } from './api'
import type {
    AssociativeImage,
    CreateAssociativeImageDTO,
    UpdateAssociativeImageDTO,
} from '~/models/associative-image'

export const associativeImageService = {
    getListForPsycho: (params?: { search?: string; limit?: number; offset?: number }) =>
        api.get<{ images: AssociativeImage[]; total: number }>('/associative-images', { params }),

    createForPsycho: (data: CreateAssociativeImageDTO) =>
        api.post<{ image: AssociativeImage }>('/associative-images', data),

    updateNameForPsycho: (id: string, data: UpdateAssociativeImageDTO) =>
        api.patch<{ image: AssociativeImage }>(`/associative-images/${id}`, data),

    deleteForPsycho: (id: string) => api.delete(`/associative-images/${id}`),
}
