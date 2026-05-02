import { api } from './api'
import type { Attachment, UpdateNoteDTO } from '~/models/attachment'

export const noteService = {
    update: (clientId: string, appointmentId: string, noteId: string, data: UpdateNoteDTO) =>
        api.patch<{ note: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`,
            data,
        ),
}
