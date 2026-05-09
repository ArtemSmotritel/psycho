import { isAxiosError } from 'axios'
import { api } from './api'
import { clientAtt, psychoAtt } from './paths'
import type {
    Attachment,
    AttachmentType,
    ClientAttachmentList,
    CreateAttachmentClientDTO,
    CreateAttachmentPsychoDTO,
    ImpressionCompletion,
    PsychoAttachmentList,
    RecommendationReaction,
    UpdateAttachmentDTO,
} from '~/models/attachment'

export interface AttachmentDetailResponse {
    attachment: Attachment
    reaction?: RecommendationReaction | null
}

export interface ClientAttachmentDetailResponse {
    attachment: Attachment
    reaction?: RecommendationReaction | null
    completion?: ImpressionCompletion | null
}

export const attachmentService = {
    getByIdForPsycho: (clientId: string, appointmentId: string, attachmentId: string) =>
        api.get<AttachmentDetailResponse>(psychoAtt(clientId, appointmentId, attachmentId)),

    listForPsycho: (clientId: string, appointmentId: string, type?: AttachmentType) =>
        api.get<PsychoAttachmentList>(psychoAtt(clientId, appointmentId), {
            params: type ? { type } : undefined,
        }),

    listForClient: (appointmentId: string, type?: Exclude<AttachmentType, 'note'>) =>
        api.get<ClientAttachmentList>(clientAtt(appointmentId), {
            params: type ? { type } : undefined,
        }),

    createForPsycho: (clientId: string, appointmentId: string, data: CreateAttachmentPsychoDTO) =>
        api.post<{ attachment: Attachment }>(psychoAtt(clientId, appointmentId), data),

    createForClient: (appointmentId: string, data: CreateAttachmentClientDTO) =>
        api.post<{ attachment: Attachment }>(clientAtt(appointmentId), data),

    updateForPsycho: (
        clientId: string,
        appointmentId: string,
        attachmentId: string,
        data: UpdateAttachmentDTO,
    ) =>
        api.patch<{ attachment: Attachment }>(
            psychoAtt(clientId, appointmentId, attachmentId),
            data,
        ),

    deleteForPsycho: (clientId: string, appointmentId: string, attachmentId: string) =>
        api.delete(psychoAtt(clientId, appointmentId, attachmentId)),

    getByIdForClient: (appointmentId: string, attachmentId: string) =>
        api.get<ClientAttachmentDetailResponse>(clientAtt(appointmentId, attachmentId)),

    deleteForClient: (appointmentId: string, attachmentId: string) =>
        api.delete(clientAtt(appointmentId, attachmentId)),
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

export function getCreateAttachmentErrorMessage(err: unknown, fallback: string): string {
    if (isAxiosError(err) && err.response?.status === 400) {
        const data = err.response.data
        if (data?.error === 'AttachmentLimitReached') {
            const max = data?.details?.max
            const type = data?.details?.type
            return typeof max === 'number' && typeof type === 'string'
                ? `Maximum number of ${type}s for this appointment reached (${max}).`
                : 'Maximum number of attachments for this appointment reached.'
        }
    }
    return fallback
}
