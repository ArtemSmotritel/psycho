import { api } from './api'
import type { Attachment } from '~/models/attachment'

export const attachmentService = {
    getById: (clientId: string, appointmentId: string, attachmentId: string) =>
        api.get<{ attachment: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments/${attachmentId}`,
        ),
}
