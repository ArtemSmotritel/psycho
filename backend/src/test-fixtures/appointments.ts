import type { Appointment } from '../features/appointments/models'
import { AppointmentsRepo, type InsertAppointmentParams } from '../features/appointments/repo'

export const createAppointment = (params: InsertAppointmentParams): Promise<Appointment> =>
    AppointmentsRepo.insert(params)

export const startAppointment = (appointmentId: string): Promise<Appointment> =>
    AppointmentsRepo.markStarted(appointmentId)

export const endAppointment = (appointmentId: string): Promise<Appointment> =>
    AppointmentsRepo.markEnded(appointmentId)

export const findAppointmentByIdForParticipant = (
    appointmentId: string,
    userId: string,
): Promise<Appointment | null> => AppointmentsRepo.findByIdForParticipant(appointmentId, userId)
