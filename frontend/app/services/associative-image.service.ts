import { api } from './api'
import type {
    AssociativeImage,
    CreateAssociativeImageDTO,
    UpdateAssociativeImageDTO,
} from '~/models/associative-image'

export const associativeImageService = {
    getList: () => api.get<{ images: AssociativeImage[] }>('/associative-images'),

    create: (data: CreateAssociativeImageDTO) =>
        api.post<{ image: AssociativeImage }>('/associative-images', data),

    updateName: (id: string, data: UpdateAssociativeImageDTO) =>
        api.patch<{ image: AssociativeImage }>(`/associative-images/${id}`, data),

    delete: (id: string) => api.delete(`/associative-images/${id}`),
}
