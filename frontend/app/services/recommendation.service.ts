import { api } from './api'
import type {
    AttachmentWithReaction,
    CreateRecommendationDTO,
    RecommendationReaction,
    SetReplyDTO,
    UpdateRecommendationDTO,
    UpsertReactionDTO,
} from '~/models/attachment'

export const recommendationService = {
    create: (clientId: string, appointmentId: string, data: CreateRecommendationDTO) =>
        api.post<{ recommendation: AttachmentWithReaction }>(
            `/clients/${clientId}/appointments/${appointmentId}/recommendations`,
            data,
        ),

    update: (clientId: string, appointmentId: string, id: string, data: UpdateRecommendationDTO) =>
        api.patch<{ recommendation: AttachmentWithReaction }>(
            `/clients/${clientId}/appointments/${appointmentId}/recommendations/${id}`,
            data,
        ),

    delete: (clientId: string, appointmentId: string, id: string) =>
        api.delete(`/clients/${clientId}/appointments/${appointmentId}/recommendations/${id}`),

    react: (appointmentId: string, attachmentId: string, data: UpsertReactionDTO) =>
        api.patch<{ reaction: RecommendationReaction }>(
            `/client/appointments/${appointmentId}/recommendations/${attachmentId}/reaction`,
            data,
        ),

    reply: (clientId: string, appointmentId: string, attachmentId: string, data: SetReplyDTO) =>
        api.patch<{ reaction: RecommendationReaction }>(
            `/clients/${clientId}/appointments/${appointmentId}/recommendations/${attachmentId}/reply`,
            data,
        ),
}
