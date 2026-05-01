import { api } from './api'
import type {
    Attachment,
    AttachmentType,
    ClientAttachmentList,
    ImpressionCompletion,
    PsychoAttachmentList,
    RecommendationReaction,
} from '~/models/attachment'

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

    listForPsycho: (clientId: string, appointmentId: string, type?: AttachmentType) =>
        api.get<PsychoAttachmentList>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments`,
            { params: type ? { type } : undefined },
        ),

    listForClient: (appointmentId: string, type?: Exclude<AttachmentType, 'note'>) =>
        api.get<ClientAttachmentList>(`/client/appointments/${appointmentId}/attachments`, {
            params: type ? { type } : undefined,
        }),
}
