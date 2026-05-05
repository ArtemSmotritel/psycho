import { api } from './api'
import { clientAtt, psychoAtt } from './paths'
import type { RecommendationReaction, SetReplyDTO, UpsertReactionDTO } from '~/models/attachment'

export const recommendationService = {
    reactForClient: (appointmentId: string, attachmentId: string, data: UpsertReactionDTO) =>
        api.patch<{ reaction: RecommendationReaction }>(
            `${clientAtt(appointmentId, attachmentId)}/reaction`,
            data,
        ),

    replyForPsycho: (
        clientId: string,
        appointmentId: string,
        attachmentId: string,
        data: SetReplyDTO,
    ) =>
        api.patch<{ reaction: RecommendationReaction }>(
            `${psychoAtt(clientId, appointmentId, attachmentId)}/reply`,
            data,
        ),
}
