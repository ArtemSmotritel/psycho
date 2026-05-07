import { db } from 'config/db'
import { ATTACHMENT_SELECT, REACTION_JSON_EXPR } from '../attachments/repo'
import type { Attachment, AttachmentWithReaction } from '../attachments/models'
import type { AttachmentWithAppointment } from './models'

export const ProgressRepo = {
    async listImpressionsByPair(
        clientId: string,
        psychoId: string,
    ): Promise<AttachmentWithAppointment[]> {
        const rows = await db`
            SELECT
                ${db.unsafe(ATTACHMENT_SELECT)},
                ap.start_time AS "appointmentStartTime"
            FROM attachments a
            JOIN appointments ap ON ap.id = a.appointment_id
            WHERE ap.psycho_id = ${psychoId}
              AND ap.client_id = ${clientId}
              AND a.type = 'impression'
            ORDER BY a.created_at ASC
        `
        return rows as AttachmentWithAppointment[]
    },

    async listEndedAppointmentsForPair(
        clientId: string,
        psychoId: string,
    ): Promise<Array<{ id: string; startTime: string; endTime: string; status: 'past' }>> {
        const rows = await db`
            SELECT
                id,
                start_time AS "startTime",
                end_time AS "endTime",
                'past' AS status
            FROM appointments
            WHERE client_id = ${clientId}
              AND psycho_id = ${psychoId}
              AND ended_at IS NOT NULL
            ORDER BY start_time ASC
        `
        return rows as Array<{
            id: string
            startTime: string
            endTime: string
            status: 'past'
        }>
    },

    async listClientImpressionsForPair(clientId: string, psychoId: string): Promise<Attachment[]> {
        const rows = await db`
            SELECT ${db.unsafe(ATTACHMENT_SELECT)}
            FROM attachments a
            JOIN appointments ap ON ap.id = a.appointment_id
            WHERE ap.client_id = ${clientId}
              AND ap.psycho_id = ${psychoId}
              AND ap.ended_at IS NOT NULL
              AND a.type = 'impression'
              AND a.author_id = ${clientId}
            ORDER BY a.appointment_id, a.created_at ASC
        `
        return rows as Attachment[]
    },

    async listRecommendationsWithReactionsForPair(
        clientId: string,
        psychoId: string,
    ): Promise<AttachmentWithReaction[]> {
        const rows = await db`
            SELECT
                ${db.unsafe(ATTACHMENT_SELECT)},
                ${db.unsafe(REACTION_JSON_EXPR)}
            FROM attachments a
            JOIN appointments ap ON ap.id = a.appointment_id
            LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
            WHERE ap.client_id = ${clientId}
              AND ap.psycho_id = ${psychoId}
              AND ap.ended_at IS NOT NULL
              AND a.type = 'recommendation'
            ORDER BY a.appointment_id, a.created_at ASC
        `
        return rows as AttachmentWithReaction[]
    },
} as const
