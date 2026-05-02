import { isAxiosError } from 'axios'
import { api } from './api'
import type {
    Attachment,
    AttachmentType,
    ClientAttachmentList,
    CreateAttachmentClientDTO,
    CreateAttachmentPsychoDTO,
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

    createForPsycho: (clientId: string, appointmentId: string, data: CreateAttachmentPsychoDTO) =>
        api.post<{ attachment: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments`,
            data,
        ),

    createForClient: (appointmentId: string, data: CreateAttachmentClientDTO) =>
        api.post<{ attachment: Attachment }>(
            `/client/appointments/${appointmentId}/attachments`,
            data,
        ),

    deleteForPsycho: (clientId: string, appointmentId: string, attachmentId: string) =>
        api.delete(
            `/clients/${clientId}/appointments/${appointmentId}/attachments/${attachmentId}`,
        ),

    deleteForClient: (appointmentId: string, attachmentId: string) =>
        api.delete(`/client/appointments/${appointmentId}/attachments/${attachmentId}`),
}

export function getDeleteAttachmentErrorMessage(err: unknown): string {
    if (isAxiosError(err) && err.response?.status === 409) {
        const code = err.response.data?.error
        if (code === 'RecommendationHasReaction') {
            return 'Cannot delete: the client has already reacted to this recommendation.'
        }
        if (code === 'ImpressionHasCompletion') {
            return 'Cannot delete: the psychologist has already completed this impression.'
        }
    }
    return 'Failed to delete attachment. Please try again.'
}
