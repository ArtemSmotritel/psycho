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

const REACTION_COLUMNS = `
    attachment_id AS "attachmentId",
    done,
    client_comment AS "clientComment",
    psychologist_reply AS "psychologistReply",
    updated_at AS "updatedAt"
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
    async insert(
        params: {
            appointmentId: string
            authorId: string
            type: AttachmentType
            name: string | null
            text: string | null
        },
        executor: SQL = db,
    ): Promise<{ id: string }> {
        const [row] = await executor`
            INSERT INTO attachments (appointment_id, author_id, type, name, text)
            VALUES (
                ${params.appointmentId},
                ${params.authorId},
                ${params.type},
                ${params.name},
                ${params.text}
            )
            RETURNING id
        `
        return row as { id: string }
    },

    async countByTypeForAppointment(
        appointmentId: string,
        type: AttachmentType,
        executor: SQL = db,
    ): Promise<number> {
        const [row] = await executor`
            SELECT COUNT(*)::int AS count
            FROM attachments
            WHERE appointment_id = ${appointmentId}
              AND type = ${type}
        `
        return (row as { count: number }).count
    },

    async linkFiles(
        attachmentId: string,
        files: Array<{ fileId: string; fileType: 'image' | 'audio'; position: number }>,
        executor: SQL = db,
    ): Promise<void> {
        if (files.length === 0) return
        const rows = files.map((f) => ({
            attachment_id: attachmentId,
            file_id: f.fileId,
            file_type: f.fileType,
            position: f.position,
        }))
        await executor`INSERT INTO attachment_files ${executor(rows)}`
    },

    async findById(id: string, executor: SQL = db): Promise<Attachment | null> {
        const [row] = await executor`
            SELECT ${db.unsafe(ATTACHMENT_SELECT)}
            FROM attachments a
            WHERE a.id = ${id}
        `
        return (row as Attachment) ?? null
    },

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
        const typesFilter = types?.length ? db`AND a.type IN ${db(types)}` : db``
        const rows = await db`
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
              ${typesFilter}
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
        const typesFilter = types?.length ? db`AND a.type IN ${db(types)}` : db``
        const rows = await db`
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
              ${typesFilter}
            ORDER BY a.type, a.created_at ASC
        `
        return (rows as AttachmentChainRow[]).map(rowToChain)
    },

    async update(
        id: string,
        params: { name: string | null; text: string | null },
        executor: SQL = db,
    ): Promise<void> {
        await executor`
            UPDATE attachments
            SET name = COALESCE(${params.name}, name),
                text = COALESCE(${params.text}, text),
                updated_at = NOW()
            WHERE id = ${id}
        `
    },

    async unlinkFiles(attachmentId: string, fileIds: string[], executor: SQL = db): Promise<void> {
        if (fileIds.length === 0) return
        await executor`
            DELETE FROM attachment_files
            WHERE attachment_id = ${attachmentId}
              AND file_id IN ${executor(fileIds)}
        `
    },

    async upsertReaction(
        attachmentId: string,
        params: { done?: boolean; comment?: string },
    ): Promise<RecommendationReaction> {
        const [row] = await db`
            INSERT INTO recommendation_reactions (attachment_id, done, client_comment)
            VALUES (
                ${attachmentId},
                ${params.done ?? false},
                ${params.comment ?? null}
            )
            ON CONFLICT (attachment_id) DO UPDATE SET
                done = COALESCE(EXCLUDED.done, recommendation_reactions.done),
                client_comment = CASE
                    WHEN recommendation_reactions.client_comment IS NULL THEN EXCLUDED.client_comment
                    ELSE recommendation_reactions.client_comment
                END,
                updated_at = NOW()
            RETURNING ${db.unsafe(REACTION_COLUMNS)}
        `
        return row as RecommendationReaction
    },

    async setReply(attachmentId: string, reply: string): Promise<RecommendationReaction> {
        const [row] = await db`
            INSERT INTO recommendation_reactions (attachment_id, psychologist_reply)
            VALUES (${attachmentId}, ${reply})
            ON CONFLICT (attachment_id) DO UPDATE SET
                psychologist_reply = EXCLUDED.psychologist_reply,
                updated_at = NOW()
            RETURNING ${db.unsafe(REACTION_COLUMNS)}
        `
        return row as RecommendationReaction
    },

    async insertImpressionCompletion(
        attachmentId: string,
        clientResponse: string,
    ): Promise<ImpressionCompletion> {
        const [row] = await db`
            INSERT INTO impression_completions (attachment_id, client_response)
            VALUES (${attachmentId}, ${clientResponse})
            RETURNING
                attachment_id AS "attachmentId",
                client_response AS "clientResponse",
                created_at AS "createdAt"
        `
        return row as ImpressionCompletion
    },
} as const
