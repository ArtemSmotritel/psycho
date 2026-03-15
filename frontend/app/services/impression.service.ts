import { api } from './api'
import type {
    Attachment,
    AttachmentWithAppointment,
    CreateImpressionDTO,
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
}
