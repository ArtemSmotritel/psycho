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
        api.patch<{ attachment: AttachmentWithReaction }>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments/${id}`,
            data,
        ),

    react: (appointmentId: string, attachmentId: string, data: UpsertReactionDTO) =>
        api.patch<{ reaction: RecommendationReaction }>(
            `/client/appointments/${appointmentId}/attachments/${attachmentId}/reaction`,
            data,
        ),

    reply: (clientId: string, appointmentId: string, attachmentId: string, data: SetReplyDTO) =>
        api.patch<{ reaction: RecommendationReaction }>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments/${attachmentId}/reply`,
            data,
        ),
}
