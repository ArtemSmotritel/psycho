import { db } from 'config/db'
import type { AppointmentWithClient } from '../appointments/models'
import type { Client } from '../clients/models'

const STATUS_EXPR = `
    CASE
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL THEN 'past'
        WHEN started_at IS NOT NULL                          THEN 'active'
        WHEN NOW() < start_time                              THEN 'upcoming'
        WHEN NOW() <= end_time                               THEN 'warning'
        ELSE                                                      'missed'
    END
`

export interface PsychoDashboardData {
    totalClients: number
    totalUpcomingAppointments: number
    totalPastAppointments: number
    activeAppointment: AppointmentWithClient | null
    upcomingAppointments: AppointmentWithClient[]
    recentClients: Client[]
}

export async function getPsychoDashboard(psychoId: string): Promise<PsychoDashboardData> {
    const [clientCountRow] = await db`
        SELECT COUNT(DISTINCT pc.client_id)::int AS "totalClients"
        FROM psychologist_clients pc
        WHERE pc.psycho_id = ${psychoId}
          AND pc.disconnected_at IS NULL
    `
    const totalClients = clientCountRow?.totalClients ?? 0

    const [upcomingCountRow] = await db`
        SELECT COUNT(*)::int AS "count"
        FROM appointments
        WHERE psycho_id = ${psychoId}
          AND started_at IS NULL
          AND start_time > NOW()
    `
    const totalUpcomingAppointments = upcomingCountRow?.count ?? 0

    const [pastCountRow] = await db`
        SELECT COUNT(*)::int AS "count"
        FROM appointments
        WHERE psycho_id = ${psychoId}
          AND ended_at IS NOT NULL
    `
    const totalPastAppointments = pastCountRow?.count ?? 0

    const upcomingRows = await db`
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
            a.whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
            a.created_at AS "createdAt",
            u.name AS "clientName"
        FROM appointments a
        JOIN "user" u ON u.id = a.client_id
        WHERE a.psycho_id = ${psychoId}
          AND a.started_at IS NULL
          AND a.start_time > NOW()
        ORDER BY a.start_time ASC
        LIMIT 5
    `
    const upcomingAppointments = upcomingRows as AppointmentWithClient[]

    const [activeRow] = await db`
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
            a.whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
            a.created_at AS "createdAt",
            u.name AS "clientName"
        FROM appointments a
        JOIN "user" u ON u.id = a.client_id
        WHERE a.psycho_id = ${psychoId}
          AND a.started_at IS NOT NULL
          AND a.ended_at IS NULL
        LIMIT 1
    `
    const activeAppointment = (activeRow as AppointmentWithClient) ?? null

    const recentRows = await db`
        SELECT
            u.id,
            u.name,
            u.email,
            u.image
        FROM psychologist_clients pc
        JOIN "user" u ON u.id = pc.client_id
        LEFT JOIN appointments a
            ON a.client_id = pc.client_id
           AND a.psycho_id = ${psychoId}
           AND a.ended_at IS NOT NULL
        WHERE pc.psycho_id = ${psychoId}
          AND pc.disconnected_at IS NULL
        GROUP BY u.id, u.name, u.email, u.image
        ORDER BY MAX(a.ended_at) DESC NULLS LAST
        LIMIT 5
    `
    const recentClients = recentRows as Client[]

    return {
        totalClients,
        totalUpcomingAppointments,
        totalPastAppointments,
        activeAppointment,
        upcomingAppointments,
        recentClients,
    }
}
