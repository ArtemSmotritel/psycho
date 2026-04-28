import type { SQL } from 'bun'
import { db } from 'config/db'
import type { AssociativeImage } from './models'

const columns = `
    ai.id,
    ai.psychologist_id AS "psychologistId",
    ai.name,
    ai.file_id AS "fileId",
    '/api/files/' || f.stored_name AS "imageUrl",
    ai.created_at AS "createdAt",
    ai.updated_at AS "updatedAt"
`

export const AssociativeImagesRepo = {
    async findById(id: string): Promise<AssociativeImage | null> {
        const [row] = await db`
            SELECT ${db.unsafe(columns)}
            FROM associative_images ai
            JOIN files f ON f.id = ai.file_id
            WHERE ai.id = ${id}
        `
        return (row as AssociativeImage) ?? null
    },

    async findByIdForPsycho(id: string, psychoId: string): Promise<AssociativeImage | null> {
        const [row] = await db`
            SELECT ${db.unsafe(columns)}
            FROM associative_images ai
            JOIN files f ON f.id = ai.file_id
            WHERE ai.id = ${id} AND ai.psychologist_id = ${psychoId}
        `
        return (row as AssociativeImage) ?? null
    },

    async listByPsychologist(
        psychoId: string,
        opts: { search: string; limit: number; offset: number },
    ): Promise<AssociativeImage[]> {
        const whereSearch = opts.search ? db`AND ai.name ILIKE ${'%' + opts.search + '%'}` : db``
        const rows = await db`
            SELECT ${db.unsafe(columns)}
            FROM associative_images ai
            JOIN files f ON f.id = ai.file_id
            WHERE ai.psychologist_id = ${psychoId}
            ${whereSearch}
            ORDER BY ai.created_at DESC
            LIMIT ${opts.limit} OFFSET ${opts.offset}
        `
        return rows as AssociativeImage[]
    },

    async countByPsychologist(psychoId: string, search: string): Promise<number> {
        const whereSearch = search ? db`AND ai.name ILIKE ${'%' + search + '%'}` : db``
        const [row] = await db`
            SELECT COUNT(*)::int AS count
            FROM associative_images ai
            WHERE ai.psychologist_id = ${psychoId}
            ${whereSearch}
        `
        return (row as { count: number }).count
    },

    async insert(params: {
        psychologistId: string
        name: string
        fileId: string
    }): Promise<AssociativeImage> {
        const [inserted] = await db`
            INSERT INTO associative_images (psychologist_id, name, file_id)
            VALUES (${params.psychologistId}, ${params.name}, ${params.fileId})
            RETURNING id
        `
        const id = (inserted as { id: string }).id
        const row = await AssociativeImagesRepo.findById(id)
        return row as AssociativeImage
    },

    async updateName(id: string, name: string, executor: SQL = db): Promise<void> {
        await executor`
            UPDATE associative_images
            SET name = ${name}, updated_at = NOW()
            WHERE id = ${id}
        `
    },

    async deleteById(id: string, executor: SQL = db): Promise<void> {
        await executor`DELETE FROM associative_images WHERE id = ${id}`
    },
} as const
