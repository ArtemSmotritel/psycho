import { api } from './api'
import type { Attachment, CreateNoteDTO, UpdateNoteDTO } from '~/models/attachment'

export const noteService = {
    getList: (clientId: string, appointmentId: string) =>
        api.get<{ notes: Attachment[] }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes`,
        ),

    create: (clientId: string, appointmentId: string, data: CreateNoteDTO) =>
        api.post<{ note: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes`,
            data,
        ),

    getById: (clientId: string, appointmentId: string, noteId: string) =>
        api.get<{ note: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`,
        ),

    update: (clientId: string, appointmentId: string, noteId: string, data: UpdateNoteDTO) =>
        api.patch<{ note: Attachment }>(
            `/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`,
            data,
        ),

    delete: (clientId: string, appointmentId: string, noteId: string) =>
        api.delete(`/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`),
}
