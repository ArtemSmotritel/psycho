import { db } from 'config/db'
import type { AppointmentWithClient, AppointmentWithPsycho } from '../appointments/models'
import { APPOINTMENT_STATUS_EXPR, appointmentColumns } from '../appointments/repo'
import type { AttachmentWithReaction } from '../attachments/models'
import { ATTACHMENT_SELECT, REACTION_JSON_EXPR } from '../attachments/repo'
import type { Client } from '../clients/models'

export const DashboardRepo = {
    async countActiveClientsForPsycho(psychoId: string): Promise<number> {
        const [row] = await db`
            SELECT COUNT(DISTINCT pc.client_id)::int AS "count"
            FROM psychologist_clients pc
            WHERE pc.psycho_id = ${psychoId}
              AND pc.disconnected_at IS NULL
        `
        return (row?.count as number) ?? 0
    },

    async countUpcomingAppointmentsForPsycho(psychoId: string): Promise<number> {
        const [row] = await db`
            SELECT COUNT(*)::int AS "count"
            FROM appointments
            WHERE psycho_id = ${psychoId}
              AND started_at IS NULL
              AND start_time > NOW()
        `
        return (row?.count as number) ?? 0
    },

    async countPastAppointmentsForPsycho(psychoId: string): Promise<number> {
        const [row] = await db`
            SELECT COUNT(*)::int AS "count"
            FROM appointments
            WHERE psycho_id = ${psychoId}
              AND ended_at IS NOT NULL
        `
        return (row?.count as number) ?? 0
    },

    async listUpcomingAppointmentsWithClient(
        psychoId: string,
        limit: number,
    ): Promise<AppointmentWithClient[]> {
        const rows = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                   u.name AS "clientName"
            FROM appointments a
            JOIN "user" u ON u.id = a.client_id
            WHERE a.psycho_id = ${psychoId}
              AND a.started_at IS NULL
              AND a.start_time > NOW()
            ORDER BY a.start_time ASC
            LIMIT ${limit}
        `
        return rows as AppointmentWithClient[]
    },

    async findActiveAppointmentWithClient(psychoId: string): Promise<AppointmentWithClient | null> {
        const [row] = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                   u.name AS "clientName"
            FROM appointments a
            JOIN "user" u ON u.id = a.client_id
            WHERE a.psycho_id = ${psychoId}
              AND a.started_at IS NOT NULL
              AND a.ended_at IS NULL
            LIMIT 1
        `
        return (row as AppointmentWithClient) ?? null
    },

    async listRecentClientsForPsycho(psychoId: string, limit: number): Promise<Client[]> {
        const rows = await db`
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
            LIMIT ${limit}
        `
        return rows as Client[]
    },

    async findActiveAppointmentWithPsycho(clientId: string): Promise<AppointmentWithPsycho | null> {
        const [row] = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                   u.name AS "psychoName"
            FROM appointments a
            JOIN "user" u ON u.id = a.psycho_id
            WHERE a.client_id = ${clientId}
              AND a.started_at IS NOT NULL
              AND a.ended_at IS NULL
            LIMIT 1
        `
        return (row as AppointmentWithPsycho) ?? null
    },

    async findNextAppointmentWithPsycho(clientId: string): Promise<AppointmentWithPsycho | null> {
        const [row] = await db`
            SELECT ${db.unsafe(appointmentColumns('a.'))},
                   u.name AS "psychoName"
            FROM appointments a
            JOIN "user" u ON u.id = a.psycho_id
            WHERE a.client_id = ${clientId}
              AND a.started_at IS NULL
              AND a.start_time > NOW()
            ORDER BY a.start_time ASC
            LIMIT 1
        `
        return (row as AppointmentWithPsycho) ?? null
    },

    async listPendingRecommendationsForClient(clientId: string): Promise<AttachmentWithReaction[]> {
        const rows = await db`
            SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                   ${db.unsafe(REACTION_JSON_EXPR)}
            FROM attachments a
            JOIN appointments ap ON ap.id = a.appointment_id
            LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
            WHERE ap.client_id = ${clientId}
              AND a.type = 'recommendation'
              AND (rr.attachment_id IS NULL OR rr.done = false)
            ORDER BY a.created_at DESC
        `
        return rows as AttachmentWithReaction[]
    },

    async countAppointmentsByStatusForClient(
        clientId: string,
    ): Promise<Array<{ status: string; count: number }>> {
        const rows = await db`
            SELECT
                ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "status",
                COUNT(*)::int AS "count"
            FROM appointments
            WHERE client_id = ${clientId}
            GROUP BY ${db.unsafe(APPOINTMENT_STATUS_EXPR)}
        `
        return rows as Array<{ status: string; count: number }>
    },
} as const
