import { api } from './api'
import type { RecommendationReaction, SetReplyDTO, UpsertReactionDTO } from '~/models/attachment'

export const recommendationService = {
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
