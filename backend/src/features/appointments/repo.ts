import type { SQL } from 'bun'
import { db } from 'config/db'
import type { Appointment, AppointmentWithClient, AppointmentWithPsycho } from './models'

export const APPOINTMENT_STATUS_EXPR = `
    CASE
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL THEN 'past'
        WHEN started_at IS NOT NULL                          THEN 'active'
        WHEN NOW() < start_time                              THEN 'upcoming'
        WHEN NOW() <= end_time                               THEN 'warning'
        ELSE                                                      'missed'
    END
`

export const appointmentColumns = (prefix = '') => `
    ${prefix}id,
    ${prefix}psycho_id AS "psychoId",
    ${prefix}client_id AS "clientId",
    ${prefix}start_time AS "startTime",
    ${prefix}end_time AS "endTime",
    ${prefix}started_at AS "startedAt",
    ${prefix}ended_at AS "endedAt",
    ${APPOINTMENT_STATUS_EXPR} AS "status",
    ${prefix}google_meet_link AS "googleMeetLink",
    ${prefix}google_calendar_event_id AS "googleCalendarEventId",
    ${prefix}whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
    ${prefix}created_at AS "createdAt"
`

export interface OverlappingAppointment {
    id: string
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    conflictParticipant: 'psycho' | 'client'
}

export interface InsertAppointmentParams {
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    googleMeetLink?: string | null
    googleCalendarEventId?: string | null
}

export interface UpdateAppointmentParams {
    startTime: string
    endTime: string
    googleMeetLink: string | null
    googleCalendarEventId: string | null
}

export interface UpdateGoogleFieldsParams {
    googleMeetLink: string | null
    googleCalendarEventId: string | null
}

export interface FindOverlappingParams {
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    excludeAppointmentId?: string
}

export const AppointmentsRepo = {
    async findByIdForPsycho(
        appointmentId: string,
        psychoId: string,
        clientId: string,
        executor: SQL = db,
    ): Promise<Appointment | null> {
        const [row] = await executor`
            SELECT ${db.unsafe(appointmentColumns())}
            FROM appointments
            WHERE id = ${appointmentId}
              AND psycho_id = ${psychoId}
              AND client_id = ${clientId}
        `
        return (row as Appointment) ?? null
    },

    async findByIdForClient(
        appointmentId: string,
        clientId: string,
    ): Promise<AppointmentWithPsycho | null> {
        const [row] = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                   u.name AS "psychoName"
            FROM appointments a
            JOIN "user" u ON u.id = a.psycho_id
            WHERE a.id = ${appointmentId} AND a.client_id = ${clientId}
        `
        return (row as AppointmentWithPsycho) ?? null
    },

    async findByIdForParticipant(
        appointmentId: string,
        userId: string,
    ): Promise<Appointment | null> {
        const [row] = await db`
            SELECT ${db.unsafe(appointmentColumns())}
            FROM appointments
            WHERE id = ${appointmentId}
              AND (psycho_id = ${userId} OR client_id = ${userId})
        `
        return (row as Appointment) ?? null
    },

    async findActiveByPsycho(psychoId: string, executor: SQL = db): Promise<Appointment | null> {
        const [row] = await executor`
            SELECT ${db.unsafe(appointmentColumns())}
            FROM appointments
            WHERE psycho_id = ${psychoId}
              AND started_at IS NOT NULL
              AND ended_at IS NULL
            LIMIT 1
        `
        return (row as Appointment) ?? null
    },

    async findOverlapping(
        params: FindOverlappingParams,
        executor: SQL = db,
    ): Promise<OverlappingAppointment | null> {
        const { psychoId, clientId, startTime, endTime, excludeAppointmentId } = params

        const excludeFilter = excludeAppointmentId
            ? executor`AND id <> ${excludeAppointmentId}`
            : executor``

        const [row] = await executor`
            SELECT
                id,
                psycho_id AS "psychoId",
                client_id AS "clientId",
                start_time AS "startTime",
                end_time AS "endTime",
                CASE
                    WHEN psycho_id = ${psychoId} OR client_id = ${psychoId} THEN 'psycho'
                    ELSE 'client'
                END AS "conflictParticipant"
            FROM appointments
            WHERE (
                    psycho_id = ${psychoId} OR client_id = ${psychoId}
                 OR psycho_id = ${clientId} OR client_id = ${clientId}
                )
              AND start_time < ${endTime}
              AND end_time > ${startTime}
              ${excludeFilter}
            LIMIT 1
        `

        return (row as OverlappingAppointment) ?? null
    },

    async acquireOverlapLocks(executor: SQL, userIdA: string, userIdB: string): Promise<void> {
        const [first, second] = [userIdA, userIdB].sort()
        await executor`SELECT pg_advisory_xact_lock(hashtext(${first}))`
        if (second !== first) {
            await executor`SELECT pg_advisory_xact_lock(hashtext(${second}))`
        }
    },

    async listForPsychoClient(psychoId: string, clientId: string): Promise<Appointment[]> {
        const rows = await db`
            SELECT ${db.unsafe(appointmentColumns())}
            FROM appointments
            WHERE psycho_id = ${psychoId}
              AND client_id = ${clientId}
            ORDER BY start_time DESC
        `
        return rows as Appointment[]
    },

    async listForClient(clientId: string): Promise<AppointmentWithPsycho[]> {
        const rows = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                   u.name AS "psychoName"
            FROM appointments a
            JOIN "user" u ON u.id = a.psycho_id
            WHERE a.client_id = ${clientId}
            ORDER BY a.start_time DESC
        `
        return rows as AppointmentWithPsycho[]
    },

    async listAllForPsycho(psychoId: string): Promise<AppointmentWithClient[]> {
        const rows = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                u.name AS "clientName",
                COALESCE((SELECT COUNT(*) FROM attachments att WHERE att.appointment_id = a.id AND att.type = 'note'), 0)::int AS "notesCount",
                COALESCE((SELECT COUNT(*) FROM attachments att WHERE att.appointment_id = a.id AND att.type = 'impression'), 0)::int AS "impressionsCount",
                COALESCE((SELECT COUNT(*) FROM attachments att WHERE att.appointment_id = a.id AND att.type = 'recommendation'), 0)::int AS "recommendationsCount"
            FROM appointments a
            JOIN "user" u ON u.id = a.client_id
            JOIN psychologist_clients pc ON pc.client_id = a.client_id AND pc.psycho_id = a.psycho_id AND pc.disconnected_at IS NULL
            WHERE a.psycho_id = ${psychoId}
            ORDER BY a.start_time DESC
        `
        return rows as AppointmentWithClient[]
    },

    async insert(params: InsertAppointmentParams, executor: SQL = db): Promise<Appointment> {
        const [row] = await executor`
            INSERT INTO appointments (psycho_id, client_id, start_time, end_time, google_meet_link, google_calendar_event_id)
            VALUES (${params.psychoId}, ${params.clientId}, ${params.startTime}, ${params.endTime}, ${params.googleMeetLink ?? null}, ${params.googleCalendarEventId ?? null})
            RETURNING ${db.unsafe(appointmentColumns())}
        `
        return row as Appointment
    },

    async update(
        appointmentId: string,
        params: UpdateAppointmentParams,
        executor: SQL = db,
    ): Promise<Appointment> {
        const [row] = await executor`
            UPDATE appointments
            SET
                start_time = ${params.startTime},
                end_time = ${params.endTime},
                google_meet_link = ${params.googleMeetLink},
                google_calendar_event_id = ${params.googleCalendarEventId}
            WHERE id = ${appointmentId}
            RETURNING ${db.unsafe(appointmentColumns())}
        `
        return row as Appointment
    },

    async updateGoogleFields(
        appointmentId: string,
        params: UpdateGoogleFieldsParams,
    ): Promise<Appointment> {
        const [row] = await db`
            UPDATE appointments
            SET google_meet_link = ${params.googleMeetLink},
                google_calendar_event_id = ${params.googleCalendarEventId}
            WHERE id = ${appointmentId}
            RETURNING ${db.unsafe(appointmentColumns())}
        `
        return row as Appointment
    },

    async markStarted(appointmentId: string, executor: SQL = db): Promise<Appointment> {
        const [row] = await executor`
            UPDATE appointments
            SET started_at = NOW()
            WHERE id = ${appointmentId}
            RETURNING ${db.unsafe(appointmentColumns())}
        `
        return row as Appointment
    },

    async markEnded(
        appointmentId: string,
        snapshotDataUrl: string | null = null,
        executor: SQL = db,
    ): Promise<Appointment> {
        const [row] = await executor`
            UPDATE appointments
            SET ended_at = NOW(),
                whiteboard_snapshot_url = ${snapshotDataUrl}
            WHERE id = ${appointmentId}
            RETURNING ${db.unsafe(appointmentColumns())}
        `
        return row as Appointment
    },

    async deleteById(appointmentId: string): Promise<void> {
        await db`DELETE FROM appointments WHERE id = ${appointmentId}`
    },
} as const
