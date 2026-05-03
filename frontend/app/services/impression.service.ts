import { api } from './api'
import type {
    AttachmentWithAppointment,
    CompleteImpressionDTO,
    ImpressionCompletion,
} from '~/models/attachment'

export const impressionService = {
    getPsychoProgressList: (clientId: string) =>
        api.get<{ impressions: AttachmentWithAppointment[] }>(
            `/clients/${clientId}/progress/impressions`,
        ),

    complete: (appointmentId: string, attachmentId: string, data: CompleteImpressionDTO) =>
        api.patch<{ completion: ImpressionCompletion }>(
            `/client/appointments/${appointmentId}/attachments/${attachmentId}/complete`,
            data,
        ),
}
