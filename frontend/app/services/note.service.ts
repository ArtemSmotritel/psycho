import { api } from './api'
import type { Attachment, UpdateNoteDTO } from '~/models/attachment'

export const noteService = {
    update: (clientId: string, appointmentId: string, noteId: string, data: UpdateNoteDTO) =>
        api.patch<{ attachment: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/attachments/${noteId}`,
            data,
        ),
}
