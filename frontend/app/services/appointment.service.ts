import { api } from './api'
import { clientAppt, psychoAppt } from './paths'
import type {
    Appointment,
    AppointmentWithClient,
    AppointmentWithPsycho,
    CreateAppointmentDTO,
    UpdateAppointmentDTO,
} from '~/models/appointment'

export const appointmentService = {
    createForPsycho: (clientId: string, data: CreateAppointmentDTO) =>
        api.post<{ appointment: Appointment; meetLinkGenerationFailed: boolean }>(
            psychoAppt(clientId),
            data,
        ),
    getListForPsycho: (clientId: string) =>
        api.get<{ appointments: Appointment[] }>(psychoAppt(clientId)),
    getByIdForPsycho: (clientId: string, appointmentId: string) =>
        api.get<{ appointment: Appointment }>(psychoAppt(clientId, appointmentId)),
    updateForPsycho: (clientId: string, appointmentId: string, data: UpdateAppointmentDTO) =>
        api.patch<{ appointment: Appointment; meetRescheduleFailed: boolean }>(
            psychoAppt(clientId, appointmentId),
            data,
        ),
    deleteForPsycho: (clientId: string, appointmentId: string) =>
        api.delete<{ success: boolean }>(psychoAppt(clientId, appointmentId)),
    startForPsycho: (clientId: string, appointmentId: string) =>
        api.patch<{ appointment: Appointment }>(`${psychoAppt(clientId, appointmentId)}/start`),
    endForPsycho: (clientId: string, appointmentId: string, snapshotDataUrl?: string | null) =>
        api.patch<{ appointment: Appointment }>(`${psychoAppt(clientId, appointmentId)}/end`, {
            snapshotDataUrl: snapshotDataUrl ?? null,
        }),
    getActiveForPsycho: () => api.get<{ appointment: Appointment | null }>('/psycho/appointments'),
    getAllForPsycho: () =>
        api.get<{ appointments: AppointmentWithClient[] }>('/psycho/appointments/all'),
    getListForClient: () => api.get<{ appointments: AppointmentWithPsycho[] }>(clientAppt()),
    getByIdForClient: (appointmentId: string) =>
        api.get<{ appointment: AppointmentWithPsycho }>(clientAppt(appointmentId)),
}
