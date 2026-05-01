import { db } from 'config/db'
import { NotFoundError } from 'errors/index'
import type { User } from 'utils/types'
import { AppointmentsService } from '../appointments/services'
import { FilesService } from '../files/services'
import { AttachmentCheck } from './attachment-check'
import type {
    Attachment,
    AttachmentType,
    AttachmentWithAppointment,
    AttachmentWithReaction,
    ClientAttachmentList,
    ImpressionCompletion,
    ProgressSession,
    PsychoAttachmentList,
    RecommendationReaction,
} from './models'
import {
    ATTACHMENT_SELECT,
    AttachmentsRepo,
    REACTION_JSON_EXPR,
    type AttachmentChain,
} from './repo'

export { ATTACHMENT_SELECT, REACTION_JSON_EXPR }

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

/**
 * Looks up an attachment by id and verifies it belongs to the given appointment
 * and is of the expected type. If `authorId` is provided, also verifies the author.
 * Returns null on any mismatch — callers can collapse all failures to a single 404.
 */
export async function findAndValidateAttachment(
    id: string,
    appointmentId: string,
    type: AttachmentType,
    authorId?: string,
): Promise<Attachment | null> {
    const attachment = await findAttachmentById(id)
    if (
        !attachment ||
        attachment.appointmentId !== appointmentId ||
        attachment.type !== type ||
        (authorId !== undefined && attachment.authorId !== authorId)
    ) {
        return null
    }
    return attachment
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
                await FilesService.removeFromDisk(file.storedName)
            }
        }
    })

    return (await findAttachmentById(id))!
}

export async function deleteAttachment(id: string): Promise<void> {
    await db`DELETE FROM attachments WHERE id = ${id}`
}

const REACTION_COLUMNS = `
    attachment_id AS "attachmentId",
    done,
    client_comment AS "clientComment",
    psychologist_reply AS "psychologistReply",
    updated_at AS "updatedAt"
`

export async function findReaction(attachmentId: string): Promise<RecommendationReaction | null> {
    const [row] = await db`
        SELECT ${db.unsafe(REACTION_COLUMNS)}
        FROM recommendation_reactions
        WHERE attachment_id = ${attachmentId}
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
        RETURNING ${db.unsafe(REACTION_COLUMNS)}
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
        RETURNING ${db.unsafe(REACTION_COLUMNS)}
    `
    return row as RecommendationReaction
}

export async function listAttachmentsWithReactions(
    appointmentId: string,
    type: AttachmentType,
    authorId?: string,
): Promise<AttachmentWithReaction[]> {
    const rows = authorId
        ? await db`
            SELECT
                ${db.unsafe(ATTACHMENT_SELECT)},
                ${db.unsafe(REACTION_JSON_EXPR)}
            FROM attachments a
            LEFT JOIN recommendation_reactions rr ON rr.attachment_id = a.id
            WHERE a.appointment_id = ${appointmentId}
              AND a.type = ${type}
              AND a.author_id = ${authorId}
            ORDER BY a.created_at ASC
        `
        : await db`
            SELECT
                ${db.unsafe(ATTACHMENT_SELECT)},
                ${db.unsafe(REACTION_JSON_EXPR)}
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

export async function listClientProgressByPsycho(
    clientId: string,
    psychoId: string,
): Promise<ProgressSession[]> {
    const appointments = (await db`
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
    `) as Array<{
        id: string
        startTime: string
        endTime: string
        status: 'past'
    }>

    return Promise.all(
        appointments.map(async (apt) => {
            const [impressions, recommendations] = await Promise.all([
                listAttachmentsByAuthor(apt.id, 'impression', clientId),
                listAttachmentsWithReactions(apt.id, 'recommendation'),
            ])
            return {
                id: apt.id,
                startTime: apt.startTime,
                endTime: apt.endTime,
                status: apt.status,
                impressions,
                recommendations,
            }
        }),
    )
}

export async function findImpressionCompletion(
    attachmentId: string,
): Promise<ImpressionCompletion | null> {
    const [row] = await db`
        SELECT
            attachment_id AS "attachmentId",
            client_response AS "clientResponse",
            created_at AS "createdAt"
        FROM impression_completions
        WHERE attachment_id = ${attachmentId}
    `
    return (row as ImpressionCompletion) ?? null
}

export async function completeImpression(
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
}

export async function listAttachmentsForPsychoView(
    appointmentId: string,
    psychoId: string,
    clientId: string,
    types?: AttachmentType[],
): Promise<PsychoAttachmentList> {
    await AppointmentsService.getForPsycho(appointmentId, psychoId, clientId)

    const chains = await AttachmentsRepo.listForPsychoView(appointmentId, psychoId, types)

    const result: PsychoAttachmentList = { notes: [], impressions: [], recommendations: [] }
    for (const { attachment, reaction, completion } of chains) {
        if (attachment.type === 'note') {
            result.notes.push(attachment)
        } else if (attachment.type === 'impression') {
            result.impressions.push({ ...attachment, completion })
        } else {
            result.recommendations.push({ ...attachment, reaction })
        }
    }
    return result
}

export async function listAttachmentsForClientView(
    appointmentId: string,
    clientId: string,
    types?: AttachmentType[],
): Promise<ClientAttachmentList> {
    await AppointmentsService.getForClient(appointmentId, clientId)

    const chains = await AttachmentsRepo.listForClientView(appointmentId, clientId, types)

    const result: ClientAttachmentList = { impressions: [], recommendations: [] }
    for (const { attachment, reaction, completion } of chains) {
        if (attachment.type === 'impression') {
            result.impressions.push({ ...attachment, completion })
        } else if (attachment.type === 'recommendation') {
            result.recommendations.push({ ...attachment, reaction })
        }
    }
    return result
}

export async function getAttachmentForPsychoView(input: {
    user: User
    clientId: string
    appointmentId: string
    attachmentId: string
}): Promise<AttachmentChain> {
    const result = await AttachmentCheck.forPsycho(input).run()
    // psycho per-type rule:
    // - impression: any author
    // - note / recommendation: must be authored by this psycho
    if (result.attachment.type !== 'impression' && result.attachment.authorId !== input.user.id) {
        throw new NotFoundError()
    }
    return result
}

export async function getAttachmentForClientView(input: {
    user: User
    appointmentId: string
    attachmentId: string
}): Promise<AttachmentChain> {
    const result = await AttachmentCheck.forClient(input).run()
    // client per-type rule:
    // - impression: must be authored by this client
    // - recommendation: any psycho-authored is fine
    if (result.attachment.type === 'impression' && result.attachment.authorId !== input.user.id) {
        throw new NotFoundError()
    }
    return result
}
