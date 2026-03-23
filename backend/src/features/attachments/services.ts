import { db } from 'config/db'
import { unlink } from 'node:fs/promises'
import type {
    Attachment,
    AttachmentType,
    AttachmentWithAppointment,
    AttachmentWithReaction,
    RecommendationReaction,
} from './models'

const ATTACHMENT_SELECT = `
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

export async function createAttachment(params: {
    appointmentId: string
    authorId: string
    type: AttachmentType
    name?: string | null
    text?: string | null
    imageFileIds?: string[]
    audioFileIds?: string[]
}): Promise<Attachment> {
    let attachmentId = ''

    await db.begin(async (tx) => {
        const [row] = await tx`
            INSERT INTO attachments (appointment_id, author_id, type, name, text)
            VALUES (
                ${params.appointmentId},
                ${params.authorId},
                ${params.type},
                ${params.name ?? null},
                ${params.text ?? null}
            )
            RETURNING id
        `
        attachmentId = row.id

        const imageFileIds = params.imageFileIds ?? []
        for (let i = 0; i < imageFileIds.length; i++) {
            await tx`
                INSERT INTO attachment_files (attachment_id, file_id, file_type, position)
                VALUES (${attachmentId}, ${imageFileIds[i]}, 'image', ${i})
            `
        }

        const audioFileIds = params.audioFileIds ?? []
        for (let i = 0; i < audioFileIds.length; i++) {
            await tx`
                INSERT INTO attachment_files (attachment_id, file_id, file_type, position)
                VALUES (${attachmentId}, ${audioFileIds[i]}, 'audio', ${i})
            `
        }
    })

    return (await findAttachmentById(attachmentId))!
}

export async function listAttachments(
    appointmentId: string,
    type: AttachmentType,
): Promise<Attachment[]> {
    const rows = await db`
        SELECT ${db.unsafe(ATTACHMENT_SELECT)}
        FROM attachments a
        WHERE a.appointment_id = ${appointmentId}
          AND a.type = ${type}
        ORDER BY a.created_at ASC
    `
    return rows as Attachment[]
}

export async function listAttachmentsByAuthor(
    appointmentId: string,
    type: AttachmentType,
    authorId: string,
): Promise<Attachment[]> {
    const rows = await db`
        SELECT ${db.unsafe(ATTACHMENT_SELECT)}
        FROM attachments a
        WHERE a.appointment_id = ${appointmentId}
          AND a.type = ${type}
          AND a.author_id = ${authorId}
        ORDER BY a.created_at ASC
    `
    return rows as Attachment[]
}

export async function findAttachmentById(id: string): Promise<Attachment | null> {
    const [row] = await db`
        SELECT ${db.unsafe(ATTACHMENT_SELECT)}
        FROM attachments a
        WHERE a.id = ${id}
    `
    return (row as Attachment) ?? null
}

export async function updateAttachment(
    id: string,
    params: { name?: string | null; text?: string | null; removeFileIds?: string[] },
): Promise<Attachment> {
    await db.begin(async (tx) => {
        await tx`
            UPDATE attachments
            SET name = COALESCE(${params.name ?? null}, name),
                text = COALESCE(${params.text ?? null}, text),
                updated_at = NOW()
            WHERE id = ${id}
        `

        const removeFileIds = params.removeFileIds ?? []
        if (removeFileIds.length > 0) {
            await tx`
                DELETE FROM attachment_files
                WHERE attachment_id = ${id}
                  AND file_id IN ${tx(removeFileIds)}
            `

            const files = await tx`
                SELECT id, stored_name AS "storedName"
                FROM files
                WHERE id IN ${tx(removeFileIds)}
            `

            await tx`
                DELETE FROM files
                WHERE id IN ${tx(removeFileIds)}
            `

            for (const file of files) {
                const filePath = `./uploads/${file.storedName}`
                try {
                    ;(await Bun.file(filePath).exists()) && (await unlink(filePath))
                } catch {
                    // file already gone from disk — not critical
                }
            }
        }
    })

    return (await findAttachmentById(id))!
}

export async function deleteAttachment(id: string): Promise<void> {
    await db`DELETE FROM attachments WHERE id = ${id}`
}

const REACTION_SELECT = `
    rr.attachment_id AS "attachmentId",
    rr.done,
    rr.client_comment AS "clientComment",
    rr.psychologist_reply AS "psychologistReply",
    rr.updated_at AS "updatedAt"
`

export async function findReaction(attachmentId: string): Promise<RecommendationReaction | null> {
    const [row] = await db`
        SELECT ${db.unsafe(REACTION_SELECT)}
        FROM recommendation_reactions rr
        WHERE rr.attachment_id = ${attachmentId}
    `
    return (row as RecommendationReaction) ?? null
}

export async function upsertReaction(
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
        RETURNING
            attachment_id AS "attachmentId",
            done,
            client_comment AS "clientComment",
            psychologist_reply AS "psychologistReply",
            updated_at AS "updatedAt"
    `
    return row as RecommendationReaction
}

export async function setReply(
    attachmentId: string,
    reply: string,
): Promise<RecommendationReaction> {
    const [row] = await db`
        INSERT INTO recommendation_reactions (attachment_id, psychologist_reply)
        VALUES (${attachmentId}, ${reply})
        ON CONFLICT (attachment_id) DO UPDATE SET
            psychologist_reply = EXCLUDED.psychologist_reply,
            updated_at = NOW()
        RETURNING
            attachment_id AS "attachmentId",
            done,
            client_comment AS "clientComment",
            psychologist_reply AS "psychologistReply",
            updated_at AS "updatedAt"
    `
    return row as RecommendationReaction
}

export async function listAttachmentsWithReactions(
    appointmentId: string,
    type: AttachmentType,
): Promise<AttachmentWithReaction[]> {
    const rows = await db`
        SELECT
            ${db.unsafe(ATTACHMENT_SELECT)},
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
        FROM attachments a
        LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
        WHERE a.appointment_id = ${appointmentId}
          AND a.type = ${type}
        ORDER BY a.created_at ASC
    `
    return rows as AttachmentWithReaction[]
}

export async function listImpressionsForClientByPsycho(
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
}

export async function listPendingRecommendationsForClient(
    clientId: string,
): Promise<AttachmentWithReaction[]> {
    const rows = await db`
        SELECT
            ${db.unsafe(ATTACHMENT_SELECT)},
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
        FROM attachments a
        JOIN appointments ap ON ap.id = a.appointment_id
        LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
        WHERE ap.client_id = ${clientId}
          AND a.type = 'recommendation'
          AND (rr.attachment_id IS NULL OR rr.done = false)
        ORDER BY a.created_at DESC
    `
    return rows as AttachmentWithReaction[]
}

export async function listAttachmentsWithReactionsByAuthor(
    appointmentId: string,
    type: AttachmentType,
    authorId: string,
): Promise<AttachmentWithReaction[]> {
    const rows = await db`
        SELECT
            ${db.unsafe(ATTACHMENT_SELECT)},
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
        FROM attachments a
        LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
        WHERE a.appointment_id = ${appointmentId}
          AND a.type = ${type}
          AND a.author_id = ${authorId}
        ORDER BY a.created_at ASC
    `
    return rows as AttachmentWithReaction[]
}
