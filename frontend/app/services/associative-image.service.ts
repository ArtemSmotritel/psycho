import { api } from './api'
import type {
    AssociativeImage,
    CreateAssociativeImageDTO,
    UpdateAssociativeImageDTO,
} from '~/models/associative-image'

export const associativeImageService = {
    getList: (params?: { search?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.search) query.set('search', params.search)
        if (params?.limit) query.set('limit', String(params.limit))
        if (params?.offset) query.set('offset', String(params.offset))
        const qs = query.toString()
        return api.get<{ images: AssociativeImage[]; total: number }>(
            `/associative-images${qs ? `?${qs}` : ''}`,
        )
    },

    create: (data: CreateAssociativeImageDTO) =>
        api.post<{ image: AssociativeImage }>('/associative-images', data),

    updateName: (id: string, data: UpdateAssociativeImageDTO) =>
        api.patch<{ image: AssociativeImage }>(`/associative-images/${id}`, data),

    delete: (id: string) => api.delete(`/associative-images/${id}`),
}
