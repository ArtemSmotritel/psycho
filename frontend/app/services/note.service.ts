import { api } from './api'
import type { Attachment, CreateNoteDTO, UpdateNoteDTO } from '~/models/attachment'

export const noteService = {
    create: (clientId: string, appointmentId: string, data: CreateNoteDTO) =>
        api.post<{ note: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes`,
            data,
        ),

    update: (clientId: string, appointmentId: string, noteId: string, data: UpdateNoteDTO) =>
        api.patch<{ note: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`,
            data,
        ),

    delete: (clientId: string, appointmentId: string, noteId: string) =>
        api.delete(`/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`),
}
