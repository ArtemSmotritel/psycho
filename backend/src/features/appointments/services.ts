import { db } from 'config/db'
import type { Appointment, AppointmentWithClient, AppointmentWithPsycho } from './models'

const STATUS_EXPR = `
    CASE
        WHEN started_at IS NOT NULL
         AND (ended_at IS NOT NULL OR end_time <= NOW()) THEN 'past'
        WHEN started_at IS NOT NULL                      THEN 'active'
        WHEN NOW() < start_time                          THEN 'upcoming'
        WHEN NOW() <= end_time                           THEN 'warning'
        ELSE                                                  'missed'
    END
`

export const createAppointment = async (params: {
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    googleMeetLink?: string | null
    googleCalendarEventId?: string | null
}): Promise<Appointment> => {
    const [row] = await db`
        INSERT INTO appointments (psycho_id, client_id, start_time, end_time, google_meet_link, google_calendar_event_id)
        VALUES (${params.psychoId}, ${params.clientId}, ${params.startTime}, ${params.endTime}, ${params.googleMeetLink ?? null}, ${params.googleCalendarEventId ?? null})
        RETURNING
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            started_at AS "startedAt",
            ended_at AS "endedAt",
            ${db.unsafe(STATUS_EXPR)} AS "status",
            google_meet_link AS "googleMeetLink",
            google_calendar_event_id AS "googleCalendarEventId",
            whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
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
            started_at AS "startedAt",
            ended_at AS "endedAt",
            ${db.unsafe(STATUS_EXPR)} AS "status",
            google_meet_link AS "googleMeetLink",
            google_calendar_event_id AS "googleCalendarEventId",
            whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
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
    params: {
        startTime: string
        endTime: string
        googleMeetLink: string | null
        googleCalendarEventId?: string | null
    },
): Promise<Appointment> => {
    const calendarEventId =
        params.googleCalendarEventId !== undefined ? params.googleCalendarEventId : null
    const [row] = await db`
        UPDATE appointments
        SET
            start_time = ${params.startTime},
            end_time = ${params.endTime},
            google_meet_link = ${params.googleMeetLink},
            google_calendar_event_id = CASE
                WHEN ${params.googleCalendarEventId !== undefined} THEN ${calendarEventId}
                ELSE google_calendar_event_id
            END
        WHERE id = ${appointmentId}
        RETURNING
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            started_at AS "startedAt",
            ended_at AS "endedAt",
            ${db.unsafe(STATUS_EXPR)} AS "status",
            google_meet_link AS "googleMeetLink",
            google_calendar_event_id AS "googleCalendarEventId",
            whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
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
        SET started_at = NOW()
        WHERE id = ${appointmentId}
        RETURNING id, psycho_id AS "psychoId", client_id AS "clientId",
                  start_time AS "startTime", end_time AS "endTime",
                  started_at AS "startedAt", ended_at AS "endedAt",
                  ${db.unsafe(STATUS_EXPR)} AS "status",
                  google_meet_link AS "googleMeetLink",
                  google_calendar_event_id AS "googleCalendarEventId",
                  whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
                  created_at AS "createdAt"
    `
    return row as Appointment
}

export async function endAppointment(appointmentId: string): Promise<Appointment> {
    return endAppointmentWithSnapshot(appointmentId, null)
}

export async function endAppointmentWithSnapshot(
    appointmentId: string,
    snapshotDataUrl: string | null,
): Promise<Appointment> {
    const [row] = await db`
        UPDATE appointments
        SET ended_at = NOW(),
            whiteboard_snapshot_url = ${snapshotDataUrl}
        WHERE id = ${appointmentId}
        RETURNING id, psycho_id AS "psychoId", client_id AS "clientId",
                  start_time AS "startTime", end_time AS "endTime",
                  started_at AS "startedAt", ended_at AS "endedAt",
                  ${db.unsafe(STATUS_EXPR)} AS "status",
                  google_meet_link AS "googleMeetLink",
                  google_calendar_event_id AS "googleCalendarEventId",
                  whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
                  created_at AS "createdAt"
    `
    return row as Appointment
}

export async function findActiveAppointmentByPsycho(psychoId: string): Promise<Appointment | null> {
    const [row] = await db`
        SELECT id, psycho_id AS "psychoId", client_id AS "clientId",
               start_time AS "startTime", end_time AS "endTime",
               started_at AS "startedAt", ended_at AS "endedAt",
               ${db.unsafe(STATUS_EXPR)} AS "status",
               google_meet_link AS "googleMeetLink",
               google_calendar_event_id AS "googleCalendarEventId",
               whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
               created_at AS "createdAt"
        FROM appointments
        WHERE psycho_id = ${psychoId}
          AND started_at IS NOT NULL
          AND ended_at IS NULL
          AND end_time > NOW()
        LIMIT 1
    `
    return (row as Appointment) ?? null
}

export async function findAppointmentByIdForClient(
    appointmentId: string,
    clientId: string,
): Promise<AppointmentWithPsycho | null> {
    const [row] = await db`
        SELECT a.id, a.psycho_id AS "psychoId", a.client_id AS "clientId",
               a.start_time AS "startTime", a.end_time AS "endTime",
               a.started_at AS "startedAt", a.ended_at AS "endedAt",
               ${db.unsafe(STATUS_EXPR)} AS "status",
               a.google_meet_link AS "googleMeetLink",
               a.google_calendar_event_id AS "googleCalendarEventId",
               a.whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
               a.created_at AS "createdAt",
               u.name AS "psychoName"
        FROM appointments a
        JOIN "user" u ON u.id = a.psycho_id
        WHERE a.id = ${appointmentId} AND a.client_id = ${clientId}
    `
    return (row as AppointmentWithPsycho) ?? null
}

export async function findAppointmentByIdForParticipant(
    appointmentId: string,
    userId: string,
): Promise<Appointment | null> {
    const [row] = await db`
        SELECT
            id,
            psycho_id AS "psychoId",
            client_id AS "clientId",
            start_time AS "startTime",
            end_time AS "endTime",
            started_at AS "startedAt",
            ended_at AS "endedAt",
            ${db.unsafe(STATUS_EXPR)} AS "status",
            google_meet_link AS "googleMeetLink",
            google_calendar_event_id AS "googleCalendarEventId",
            whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
            created_at AS "createdAt"
        FROM appointments
        WHERE id = ${appointmentId}
          AND (psycho_id = ${userId} OR client_id = ${userId})
    `
    return (row as Appointment) ?? null
}

export async function listAppointmentsForClient(
    clientId: string,
): Promise<AppointmentWithPsycho[]> {
    const rows = await db`
        SELECT a.id, a.psycho_id AS "psychoId", a.client_id AS "clientId",
               a.start_time AS "startTime", a.end_time AS "endTime",
               a.started_at AS "startedAt", a.ended_at AS "endedAt",
               ${db.unsafe(STATUS_EXPR)} AS "status",
               a.google_meet_link AS "googleMeetLink",
               a.google_calendar_event_id AS "googleCalendarEventId",
               a.whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
               a.created_at AS "createdAt",
               u.name AS "psychoName"
        FROM appointments a
        JOIN "user" u ON u.id = a.psycho_id
        WHERE a.client_id = ${clientId}
        ORDER BY a.start_time DESC
    `
    return rows as AppointmentWithPsycho[]
}

export async function listAllAppointmentsForPsycho(
    psychoId: string,
): Promise<AppointmentWithClient[]> {
    const rows = await db`
        SELECT
            a.id,
            a.psycho_id AS "psychoId",
            a.client_id AS "clientId",
            a.start_time AS "startTime",
            a.end_time AS "endTime",
            a.started_at AS "startedAt",
            a.ended_at AS "endedAt",
            ${db.unsafe(STATUS_EXPR)} AS "status",
            a.google_meet_link AS "googleMeetLink",
            a.google_calendar_event_id AS "googleCalendarEventId",
            a.whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
            a.created_at AS "createdAt",
            u.name AS "clientName",
            COALESCE((SELECT COUNT(*) FROM attachments att WHERE att.appointment_id = a.id AND att.type = 'note'), 0)::int AS "notesCount",
            COALESCE((SELECT COUNT(*) FROM attachments att WHERE att.appointment_id = a.id AND att.type = 'impression'), 0)::int AS "impressionsCount",
            COALESCE((SELECT COUNT(*) FROM attachments att WHERE att.appointment_id = a.id AND att.type = 'recommendation'), 0)::int AS "recommendationsCount"
        FROM appointments a
        JOIN "user" u ON u.id = a.client_id
        WHERE a.psycho_id = ${psychoId}
        ORDER BY a.start_time DESC
    `
    return rows as AppointmentWithClient[]
}

export async function findNextUpcomingAppointmentForClient(
    clientId: string,
): Promise<AppointmentWithPsycho | null> {
    const [row] = await db`
        SELECT a.id, a.psycho_id AS "psychoId", a.client_id AS "clientId",
               a.start_time AS "startTime", a.end_time AS "endTime",
               a.started_at AS "startedAt", a.ended_at AS "endedAt",
               ${db.unsafe(STATUS_EXPR)} AS "status",
               a.google_meet_link AS "googleMeetLink",
               a.google_calendar_event_id AS "googleCalendarEventId",
               a.whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
               a.created_at AS "createdAt",
               u.name AS "psychoName"
        FROM appointments a
        JOIN "user" u ON u.id = a.psycho_id
        WHERE a.client_id = ${clientId}
          AND (
              (a.started_at IS NOT NULL AND a.ended_at IS NULL AND a.end_time > NOW())
              OR
              (a.started_at IS NULL AND a.start_time > NOW())
          )
        ORDER BY a.start_time ASC
        LIMIT 1
    `
    return (row as AppointmentWithPsycho) ?? null
}

export async function countAppointmentsForClient(
    clientId: string,
): Promise<{ upcoming: number; past: number; active: number }> {
    const rows = await db`
        SELECT
            ${db.unsafe(STATUS_EXPR)} AS "status",
            COUNT(*) AS "count"
        FROM appointments
        WHERE client_id = ${clientId}
        GROUP BY ${db.unsafe(STATUS_EXPR)}
    `

    let upcoming = 0
    let past = 0
    let active = 0

    for (const row of rows) {
        const count = Number(row.count)
        if (row.status === 'upcoming') upcoming += count
        else if (row.status === 'past') past += count
        else if (row.status === 'active') active += count
    }

    return { upcoming, past, active }
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
            started_at AS "startedAt",
            ended_at AS "endedAt",
            ${db.unsafe(STATUS_EXPR)} AS "status",
            google_meet_link AS "googleMeetLink",
            google_calendar_event_id AS "googleCalendarEventId",
            whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
            created_at AS "createdAt"
        FROM appointments
        WHERE psycho_id = ${psychoId}
          AND client_id = ${clientId}
        ORDER BY start_time DESC
    `
    return rows as Appointment[]
}
