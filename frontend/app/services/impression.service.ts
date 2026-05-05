import { api } from './api'
import type { AttachmentWithAppointment } from '~/models/attachment'

export const impressionService = {
    getProgressListForPsycho: (clientId: string) =>
        api.get<{ impressions: AttachmentWithAppointment[] }>(
            `/clients/${clientId}/progress/impressions`,
        ),
}
