import { api } from './api'
import type { Attachment, ImpressionCompletion, RecommendationReaction } from '~/models/attachment'

export interface AttachmentDetailResponse {
    attachment: Attachment
    reaction?: RecommendationReaction | null
    completion?: ImpressionCompletion | null
}

export const attachmentService = {
    getById: (clientId: string, appointmentId: string, attachmentId: string) =>
        api.get<AttachmentDetailResponse>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments/${attachmentId}`,
        ),
}
