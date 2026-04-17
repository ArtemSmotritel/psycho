import { db } from 'config/db'
import { unlink } from 'node:fs/promises'
import type { AssociativeImage } from './models'

export async function listByPsychologist(
    psychologistId: string,
    opts?: { search?: string; limit?: number; offset?: number },
): Promise<{ images: AssociativeImage[]; total: number }> {
    const search = opts?.search?.trim() ?? ''
    const limit = opts?.limit ?? 20
    const offset = opts?.offset ?? 0

    const whereSearch = search ? db`AND ai.name ILIKE ${'%' + search + '%'}` : db``

    const [{ count }] = await db`
        SELECT COUNT(*)::int AS count
        FROM associative_images ai
        WHERE ai.psychologist_id = ${psychologistId}
        ${whereSearch}
    `

    const rows = await db`
        SELECT
            ai.id,
            ai.psychologist_id AS "psychologistId",
            ai.name,
            ai.file_id AS "fileId",
            '/api/files/' || f.stored_name AS "imageUrl",
            ai.created_at AS "createdAt",
            ai.updated_at AS "updatedAt"
        FROM associative_images ai
        JOIN files f ON f.id = ai.file_id
        WHERE ai.psychologist_id = ${psychologistId}
        ${whereSearch}
        ORDER BY ai.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `
    return { images: rows as AssociativeImage[], total: count }
}

export async function findById(id: string): Promise<AssociativeImage | null> {
    const [row] = await db`
        SELECT
            ai.id,
            ai.psychologist_id AS "psychologistId",
            ai.name,
            ai.file_id AS "fileId",
            '/api/files/' || f.stored_name AS "imageUrl",
            ai.created_at AS "createdAt",
            ai.updated_at AS "updatedAt"
        FROM associative_images ai
        JOIN files f ON f.id = ai.file_id
        WHERE ai.id = ${id}
    `
    return (row as AssociativeImage) ?? null
}

export async function create(params: {
    psychologistId: string
    name: string
    fileId: string
}): Promise<AssociativeImage> {
    const [row] = await db`
        INSERT INTO associative_images (psychologist_id, name, file_id)
        VALUES (${params.psychologistId}, ${params.name}, ${params.fileId})
        RETURNING id
    `
    return (await findById(row.id))!
}

export async function updateName(
    id: string,
    psychologistId: string,
    name: string,
): Promise<AssociativeImage | null> {
    const [row] = await db`
        UPDATE associative_images
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${id} AND psychologist_id = ${psychologistId}
        RETURNING id
    `
    if (!row) return null
    return findById(id)
}

export async function deleteImage(id: string, psychologistId: string): Promise<boolean> {
    const [image] = await db`
        SELECT ai.id, ai.file_id AS "fileId", f.stored_name AS "storedName"
        FROM associative_images ai
        JOIN files f ON f.id = ai.file_id
        WHERE ai.id = ${id} AND ai.psychologist_id = ${psychologistId}
    `
    if (!image) return false

    await db.begin(async (tx) => {
        await tx`DELETE FROM associative_images WHERE id = ${id}`
        await tx`DELETE FROM files WHERE id = ${image.fileId}`
    })

    const filePath = `./uploads/${image.storedName}`
    try {
        ;(await Bun.file(filePath).exists()) && (await unlink(filePath))
    } catch {
        // file already gone from disk — not critical
    }

    return true
}
