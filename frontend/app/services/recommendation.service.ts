import { api } from './api'
import type {
    AttachmentWithReaction,
    RecommendationReaction,
    SetReplyDTO,
    UpdateRecommendationDTO,
    UpsertReactionDTO,
} from '~/models/attachment'

export const recommendationService = {
    update: (clientId: string, appointmentId: string, id: string, data: UpdateRecommendationDTO) =>
        api.patch<{ recommendation: AttachmentWithReaction }>(
            `/clients/${clientId}/appointments/${appointmentId}/recommendations/${id}`,
            data,
        ),

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
