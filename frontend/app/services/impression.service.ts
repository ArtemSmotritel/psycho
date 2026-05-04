import { api } from './api'
import type { AttachmentWithAppointment } from '~/models/attachment'

export const impressionService = {
    getPsychoProgressList: (clientId: string) =>
        api.get<{ impressions: AttachmentWithAppointment[] }>(
            `/clients/${clientId}/progress/impressions`,
        ),
}
