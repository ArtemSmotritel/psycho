import { db } from 'config/db'
import type { Appointment } from './models'

export const createAppointment = async (params: {
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    googleMeetLink?: string | null
}): Promise<Appointment> => {
    const [row] = await db`
        INSERT INTO appointments (psycho_id, client_id, start_time, end_time, google_meet_link)
        VALUES (${params.psychoId}, ${params.clientId}, ${params.startTime}, ${params.endTime}, ${params.googleMeetLink ?? null})
        RETURNING
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            status,
            google_meet_link AS "googleMeetLink",
            created_at AS "createdAt"
    `
    return row as Appointment
}

export const findAppointmentById = async (
    appointmentId: string,
    psychoId: string,
    clientId: string,
): Promise<Appointment | null> => {
    const [row] = await db`
        SELECT
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            status,
            google_meet_link AS "googleMeetLink",
            created_at AS "createdAt"
        FROM appointments
        WHERE id = ${appointmentId}
          AND psycho_id = ${psychoId}
          AND client_id = ${clientId}
    `
    return (row as Appointment) ?? null
}

export const updateAppointment = async (
    appointmentId: string,
    params: { startTime: string; endTime: string; googleMeetLink: string | null },
): Promise<Appointment> => {
    const [row] = await db`
        UPDATE appointments
        SET
            start_time = ${params.startTime},
            end_time = ${params.endTime},
            google_meet_link = ${params.googleMeetLink}
        WHERE id = ${appointmentId}
        RETURNING
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            status,
            google_meet_link AS "googleMeetLink",
            created_at AS "createdAt"
    `
    return row as Appointment
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
    await db`DELETE FROM appointments WHERE id = ${appointmentId}`
}

export const isClientLinkedAndActive = async (
    clientId: string,
    psychoId: string,
): Promise<boolean> => {
    const [row] =
        await db`SELECT 1 FROM psychologist_clients WHERE client_id = ${clientId} AND psycho_id = ${psychoId} AND disconnected_at IS NULL`
    return row !== undefined
}

export async function startAppointment(appointmentId: string): Promise<Appointment> {
    const [row] = await db`
        UPDATE appointments
        SET status = 'active'
        WHERE id = ${appointmentId}
        RETURNING id, psycho_id AS "psychoId", client_id AS "clientId",
                  start_time AS "startTime", end_time AS "endTime",
                  status, google_meet_link AS "googleMeetLink", created_at AS "createdAt"
    `
    return row as Appointment
}

export async function findActiveAppointmentByPsycho(psychoId: string): Promise<Appointment | null> {
    const [row] = await db`
        SELECT id, psycho_id AS "psychoId", client_id AS "clientId",
               start_time AS "startTime", end_time AS "endTime",
               status, google_meet_link AS "googleMeetLink", created_at AS "createdAt"
        FROM appointments
        WHERE psycho_id = ${psychoId} AND status = 'active'
        LIMIT 1
    `
    return (row as Appointment) ?? null
}

export const listAppointments = async (
    psychoId: string,
    clientId: string,
): Promise<Appointment[]> => {
    const rows = await db`
        SELECT
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            status,
            google_meet_link AS "googleMeetLink",
            created_at AS "createdAt"
        FROM appointments
        WHERE psycho_id = ${psychoId}
          AND client_id = ${clientId}
        ORDER BY start_time DESC
    `
    return rows as Appointment[]
}
