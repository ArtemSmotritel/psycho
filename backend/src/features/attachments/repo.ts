import type { SQL } from 'bun'
import { db } from 'config/db'
import { APPOINTMENT_STATUS_EXPR } from '../appointments/repo'
import type {
    Attachment,
    AttachmentType,
    ImpressionCompletion,
    RecommendationReaction,
} from './models'

export const ATTACHMENT_SELECT = `
    a.id,
    a.appointment_id AS "appointmentId",
    a.author_id AS "authorId",
    a.type,
    a.name,
    a.text,
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt",
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', f.id,
                'url', '/api/files/' || f.stored_name,
                'originalName', f.original_name,
                'mimeType', f.mime_type,
                'size', f.size
            ) ORDER BY af.position
        )
        FROM attachment_files af
        JOIN files f ON f.id = af.file_id
        WHERE af.attachment_id = a.id AND af.file_type = 'image'
        ), '[]'::json
    ) AS "imageFiles",
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', f.id,
                'url', '/api/files/' || f.stored_name,
                'originalName', f.original_name,
                'mimeType', f.mime_type,
                'size', f.size
            ) ORDER BY af.position
        )
        FROM attachment_files af
        JOIN files f ON f.id = af.file_id
        WHERE af.attachment_id = a.id AND af.file_type = 'audio'
        ), '[]'::json
    ) AS "audioFiles"
`

export const REACTION_JSON_EXPR = `
    CASE
        WHEN rr.attachment_id IS NOT NULL THEN json_build_object(
            'attachmentId', rr.attachment_id,
            'done', rr.done,
            'clientComment', rr.client_comment,
            'psychologistReply', rr.psychologist_reply,
            'updatedAt', rr.updated_at
        )
        ELSE NULL
    END AS reaction
`

export const COMPLETION_JSON_EXPR = `
    CASE
        WHEN ic.attachment_id IS NOT NULL THEN json_build_object(
            'attachmentId', ic.attachment_id,
            'clientResponse', ic.client_response,
            'createdAt', ic.created_at
        )
        ELSE NULL
    END AS completion
`

export type AppointmentStatus = 'upcoming' | 'active' | 'past' | 'warning' | 'missed'

export interface AttachmentChain {
    attachment: Attachment
    appointmentStatus: AppointmentStatus
    reaction: RecommendationReaction | null
    completion: ImpressionCompletion | null
}

type AttachmentChainRow = Attachment & {
    appointmentStatus: AppointmentStatus
    reaction: RecommendationReaction | null
    completion: ImpressionCompletion | null
}

function rowToChain(row: AttachmentChainRow): AttachmentChain {
    const { appointmentStatus, reaction, completion, ...attachment } = row
    return { attachment, appointmentStatus, reaction, completion }
}

export const AttachmentsRepo = {
    async findAttachmentForPsycho(
        psychoId: string,
        clientId: string,
        appointmentId: string,
        attachmentId: string,
    ): Promise<AttachmentChain | null> {
        const [row] = await db`
            SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                   ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "appointmentStatus",
                   ${db.unsafe(REACTION_JSON_EXPR)},
                   ${db.unsafe(COMPLETION_JSON_EXPR)}
            FROM attachments a
            JOIN appointments ap ON ap.id = a.appointment_id
            LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
            LEFT JOIN impression_completions ic ON ic.attachment_id = a.id
            WHERE a.id = ${attachmentId}
              AND ap.id = ${appointmentId}
              AND ap.client_id = ${clientId}
              AND ap.psycho_id = ${psychoId}
        `
        if (!row) return null
        return rowToChain(row as AttachmentChainRow)
    },

    async findAttachmentForClient(
        clientId: string,
        appointmentId: string,
        attachmentId: string,
    ): Promise<AttachmentChain | null> {
        const [row] = await db`
            SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                   ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "appointmentStatus",
                   ${db.unsafe(REACTION_JSON_EXPR)},
                   ${db.unsafe(COMPLETION_JSON_EXPR)}
            FROM attachments a
            JOIN appointments ap ON ap.id = a.appointment_id
            LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
            LEFT JOIN impression_completions ic ON ic.attachment_id = a.id
            WHERE a.id = ${attachmentId}
              AND ap.id = ${appointmentId}
              AND ap.client_id = ${clientId}
              AND a.type <> 'note'
        `
        if (!row) return null
        return rowToChain(row as AttachmentChainRow)
    },

    async listForPsychoView(
        appointmentId: string,
        psychoId: string,
        types?: AttachmentType[],
    ): Promise<AttachmentChain[]> {
        const rows = types?.length
            ? await db`
                SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                       ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "appointmentStatus",
                       ${db.unsafe(REACTION_JSON_EXPR)},
                       ${db.unsafe(COMPLETION_JSON_EXPR)}
                FROM attachments a
                JOIN appointments ap ON ap.id = a.appointment_id
                LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
                LEFT JOIN impression_completions ic ON ic.attachment_id = a.id
                WHERE ap.id = ${appointmentId}
                  AND (
                      a.type = 'impression'
                      OR (a.type IN ('note', 'recommendation') AND a.author_id = ${psychoId})
                  )
                  AND a.type IN ${db(types)}
                ORDER BY a.type, a.created_at ASC
            `
            : await db`
                SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                       ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "appointmentStatus",
                       ${db.unsafe(REACTION_JSON_EXPR)},
                       ${db.unsafe(COMPLETION_JSON_EXPR)}
                FROM attachments a
                JOIN appointments ap ON ap.id = a.appointment_id
                LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
                LEFT JOIN impression_completions ic ON ic.attachment_id = a.id
                WHERE ap.id = ${appointmentId}
                  AND (
                      a.type = 'impression'
                      OR (a.type IN ('note', 'recommendation') AND a.author_id = ${psychoId})
                  )
                ORDER BY a.type, a.created_at ASC
            `
        return (rows as AttachmentChainRow[]).map(rowToChain)
    },

    async deleteById(attachmentId: string, executor: SQL = db): Promise<void> {
        await executor`DELETE FROM attachments WHERE id = ${attachmentId}`
    },

    async listForClientView(
        appointmentId: string,
        clientId: string,
        types?: AttachmentType[],
    ): Promise<AttachmentChain[]> {
        const rows = types?.length
            ? await db`
                SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                       ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "appointmentStatus",
                       ${db.unsafe(REACTION_JSON_EXPR)},
                       ${db.unsafe(COMPLETION_JSON_EXPR)}
                FROM attachments a
                JOIN appointments ap ON ap.id = a.appointment_id
                LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
                LEFT JOIN impression_completions ic ON ic.attachment_id = a.id
                WHERE ap.id = ${appointmentId}
                  AND ap.client_id = ${clientId}
                  AND (
                      (a.type = 'impression' AND a.author_id = ${clientId})
                      OR a.type = 'recommendation'
                  )
                  AND a.type IN ${db(types)}
                ORDER BY a.type, a.created_at ASC
            `
            : await db`
                SELECT ${db.unsafe(ATTACHMENT_SELECT)},
                       ${db.unsafe(APPOINTMENT_STATUS_EXPR)} AS "appointmentStatus",
                       ${db.unsafe(REACTION_JSON_EXPR)},
                       ${db.unsafe(COMPLETION_JSON_EXPR)}
                FROM attachments a
                JOIN appointments ap ON ap.id = a.appointment_id
                LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
                LEFT JOIN impression_completions ic ON ic.attachment_id = a.id
                WHERE ap.id = ${appointmentId}
                  AND ap.client_id = ${clientId}
                  AND (
                      (a.type = 'impression' AND a.author_id = ${clientId})
                      OR a.type = 'recommendation'
                  )
                ORDER BY a.type, a.created_at ASC
            `
        return (rows as AttachmentChainRow[]).map(rowToChain)
    },
} as const
