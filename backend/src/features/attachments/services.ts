import { db } from 'config/db'
import type { Attachment, AttachmentType } from './models'

const ATTACHMENT_FIELDS = `
    id,
    appointment_id AS "appointmentId",
    author_id AS "authorId",
    type,
    name,
    text,
    image_urls AS "imageUrls",
    audio_urls AS "audioUrls",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`

function toTextArray(arr: string[]): string {
    if (arr.length === 0) return '{}'
    const escaped = arr.map((s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    return `{${escaped.join(',')}}`
}

export async function createAttachment(params: {
    appointmentId: string
    authorId: string
    type: AttachmentType
    name?: string | null
    text?: string | null
    imageUrls?: string[]
    audioUrls?: string[]
}): Promise<Attachment> {
    const imageUrlsLiteral = toTextArray(params.imageUrls ?? [])
    const audioUrlsLiteral = toTextArray(params.audioUrls ?? [])
    const [row] = await db`
        INSERT INTO attachments (appointment_id, author_id, type, name, text, image_urls, audio_urls)
        VALUES (
            ${params.appointmentId},
            ${params.authorId},
            ${params.type},
            ${params.name ?? null},
            ${params.text ?? null},
            ${imageUrlsLiteral}::text[],
            ${audioUrlsLiteral}::text[]
        )
        RETURNING ${db.unsafe(ATTACHMENT_FIELDS)}
    `
    return row as Attachment
}

export async function listAttachments(
    appointmentId: string,
    type: AttachmentType,
): Promise<Attachment[]> {
    const rows = await db`
        SELECT ${db.unsafe(ATTACHMENT_FIELDS)}
        FROM attachments
        WHERE appointment_id = ${appointmentId}
          AND type = ${type}
        ORDER BY created_at ASC
    `
    return rows as Attachment[]
}

export async function listAttachmentsByAuthor(
    appointmentId: string,
    type: AttachmentType,
    authorId: string,
): Promise<Attachment[]> {
    const rows = await db`
        SELECT ${db.unsafe(ATTACHMENT_FIELDS)}
        FROM attachments
        WHERE appointment_id = ${appointmentId}
          AND type = ${type}
          AND author_id = ${authorId}
        ORDER BY created_at ASC
    `
    return rows as Attachment[]
}

export async function findAttachmentById(id: string): Promise<Attachment | null> {
    const [row] = await db`
        SELECT ${db.unsafe(ATTACHMENT_FIELDS)}
        FROM attachments
        WHERE id = ${id}
    `
    return (row as Attachment) ?? null
}

export async function updateAttachment(
    id: string,
    params: { name?: string | null; text?: string | null },
): Promise<Attachment> {
    const [row] = await db`
        UPDATE attachments
        SET name = COALESCE(${params.name ?? null}, name),
            text = COALESCE(${params.text ?? null}, text),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING ${db.unsafe(ATTACHMENT_FIELDS)}
    `
    return row as Attachment
}

export async function deleteAttachment(id: string): Promise<void> {
    await db`DELETE FROM attachments WHERE id = ${id}`
}
