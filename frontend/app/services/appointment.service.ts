import { api } from './api'
import type {
    Appointment,
    AppointmentWithPsycho,
    CreateAppointmentDTO,
    UpdateAppointmentDTO,
} from '~/models/appointment'

export const appointmentService = {
    create: (clientId: string, data: CreateAppointmentDTO) =>
        api.post<{ appointment: Appointment }>(`/clients/${clientId}/appointments`, data),
    getList: (clientId: string) =>
        api.get<{ appointments: Appointment[] }>(`/clients/${clientId}/appointments`),
    getById: (clientId: string, appointmentId: string) =>
        api.get<{ appointment: Appointment }>(`/clients/${clientId}/appointments/${appointmentId}`),
    update: (clientId: string, appointmentId: string, data: UpdateAppointmentDTO) =>
        api.patch<{ appointment: Appointment }>(
            `/clients/${clientId}/appointments/${appointmentId}`,
            data,
        ),
    delete: (clientId: string, appointmentId: string) =>
        api.delete<{ success: boolean }>(`/clients/${clientId}/appointments/${appointmentId}`),
    start: (clientId: string, appointmentId: string) =>
        api.patch<{ appointment: Appointment }>(
            `/clients/${clientId}/appointments/${appointmentId}/start`,
        ),
    end: (clientId: string, appointmentId: string) =>
        api.patch<{ appointment: Appointment }>(
            `/clients/${clientId}/appointments/${appointmentId}/end`,
        ),
    getActiveForPsycho: () => api.get<{ appointment: Appointment | null }>('/psycho/appointments'),
    getClientGlobalList: () => api.get<{ appointments: AppointmentWithPsycho[] }>('/appointments'),
    getClientAppointmentById: (appointmentId: string) =>
        api.get<{ appointment: AppointmentWithPsycho }>(`/appointments/${appointmentId}`),
}
