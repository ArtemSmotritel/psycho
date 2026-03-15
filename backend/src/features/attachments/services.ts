import { db } from 'config/db'
import type { Attachment, AttachmentType } from './models'

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
    params: { name?: string | null; text?: string | null },
): Promise<Attachment> {
    await db`
        UPDATE attachments
        SET name = COALESCE(${params.name ?? null}, name),
            text = COALESCE(${params.text ?? null}, text),
            updated_at = NOW()
        WHERE id = ${id}
    `
    return (await findAttachmentById(id))!
}

export async function deleteAttachment(id: string): Promise<void> {
    await db`DELETE FROM attachments WHERE id = ${id}`
}
