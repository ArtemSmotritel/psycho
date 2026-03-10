import { api } from './api'
import type { Appointment, CreateAppointmentDTO, UpdateAppointmentDTO } from '~/models/appointment'

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
}
