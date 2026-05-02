import { db } from 'config/db'
import type { AppointmentWithClient, AppointmentWithPsycho } from '../appointments/models'
import type { Client } from '../clients/models'
import type { AttachmentWithReaction } from '../attachments/models'
import { ClientsRepo } from '../clients/repo'
import { APPOINTMENT_STATUS_EXPR, appointmentColumns } from '../appointments/repo'
import { ATTACHMENT_SELECT, REACTION_JSON_EXPR } from '../attachments/repo'

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
            ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "status",
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
            ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "status",
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

export async function getClientDashboard(clientId: string) {
    const [psychologists, activeRow, nextRow, pendingRecommendationRows, countRows] =
        await Promise.all([
            ClientsRepo.listPsychologistsForClient(clientId),
            db`
                SELECT ${db.unsafe(appointmentColumns('a.'))},
                       u.name AS "psychoName"
                FROM appointments a
                JOIN "user" u ON u.id = a.psycho_id
                WHERE a.client_id = ${clientId}
                  AND a.started_at IS NOT NULL
                  AND a.ended_at IS NULL
                LIMIT 1
            `,
            db`
                SELECT ${db.unsafe(appointmentColumns('a.'))},
                       u.name AS "psychoName"
                FROM appointments a
                JOIN "user" u ON u.id = a.psycho_id
                WHERE a.client_id = ${clientId}
                  AND a.started_at IS NULL
                  AND a.start_time > NOW()
                ORDER BY a.start_time ASC
                LIMIT 1
            `,
            db`
                SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                  ${db.unsafe(REACTION_JSON_EXPR)}
                FROM attachments a
                JOIN appointments ap ON ap.id = a.appointment_id
                LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
                WHERE ap.client_id = ${clientId}
                  AND a.type = 'recommendation'
                  AND (rr.attachment_id IS NULL OR rr.done = false)
                ORDER BY a.created_at DESC
            `,
            db`
                SELECT
                    ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "status",
                    COUNT(*) AS "count"
                FROM appointments
                WHERE client_id = ${clientId}
                GROUP BY ${db.unsafe(APPOINTMENT_STATUS_EXPR)}
            `,
        ])

    const activeAppointment = ((activeRow as AppointmentWithPsycho[])[0] ??
        null) as AppointmentWithPsycho | null
    const nextAppointment = ((nextRow as AppointmentWithPsycho[])[0] ??
        null) as AppointmentWithPsycho | null
    const pendingRecommendations = pendingRecommendationRows as AttachmentWithReaction[]

    // 'warning' rolls into 'upcoming' (scheduled, window arrived but not started).
    // 'missed' rolls into 'past' (window elapsed without being started).
    // Post-B2, overrun sessions remain 'active' until explicitly ended.
    let upcoming = 0
    let past = 0
    let active = 0
    for (const row of countRows) {
        const count = Number(row.count)
        if (row.status === 'upcoming' || row.status === 'warning') upcoming += count
        else if (row.status === 'past' || row.status === 'missed') past += count
        else if (row.status === 'active') active += count
    }
    const appointmentCounts = { upcoming, past, active }

    return {
        psychologists,
        activeAppointment,
        nextAppointment,
        pendingRecommendations,
        appointmentCounts,
    }
}
