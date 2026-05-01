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
        api.post<{ impression: Attachment }>(
            `/client/appointments/${appointmentId}/impressions`,
            data,
        ),

    getPsychoProgressList: (clientId: string) =>
        api.get<{ impressions: AttachmentWithAppointment[] }>(
            `/clients/${clientId}/progress/impressions`,
        ),

    complete: (appointmentId: string, attachmentId: string, data: CompleteImpressionDTO) =>
        api.patch<{ completion: ImpressionCompletion }>(
            `/client/appointments/${appointmentId}/impressions/${attachmentId}/complete`,
            data,
        ),
}
