import { api } from './api'
import type {
    Attachment,
    AttachmentWithAppointment,
    CreateImpressionDTO,
    CompleteImpressionDTO,
    ImpressionCompletion,
} from '~/models/attachment'

export const impressionService = {
    submit: (appointmentId: string, data: CreateImpressionDTO) =>
        api.post<{ impression: Attachment }>(`/appointments/${appointmentId}/impressions`, data),

    getClientList: (appointmentId: string) =>
        api.get<{ impressions: Attachment[] }>(`/appointments/${appointmentId}/impressions`),

    getPsychoList: (clientId: string, appointmentId: string) =>
        api.get<{ impressions: Attachment[] }>(
            `/clients/${clientId}/appointments/${appointmentId}/impressions`,
        ),

    getPsychoProgressList: (clientId: string) =>
        api.get<{ impressions: AttachmentWithAppointment[] }>(
            `/clients/${clientId}/progress/impressions`,
        ),

    complete: (appointmentId: string, attachmentId: string, data: CompleteImpressionDTO) =>
        api.patch<{ completion: ImpressionCompletion }>(
            `/appointments/${appointmentId}/impressions/${attachmentId}/complete`,
            data,
        ),

    getCompletion: (appointmentId: string, attachmentId: string) =>
        api.get<{ completion: ImpressionCompletion | null }>(
            `/appointments/${appointmentId}/impressions/${attachmentId}/completion`,
        ),

    getPsychoCompletion: (clientId: string, appointmentId: string, attachmentId: string) =>
        api.get<{ completion: ImpressionCompletion | null }>(
            `/clients/${clientId}/appointments/${appointmentId}/impressions/${attachmentId}/completion`,
        ),
}
