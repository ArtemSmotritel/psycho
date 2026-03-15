import { db } from 'config/db'
import { randomUUID } from 'crypto'

export async function insertTestFile(
    uploadedBy: string,
    overrides: {
        originalName?: string
        storedName?: string
        mimeType?: string
        size?: number
    } = {},
) {
    const storedName = overrides.storedName ?? `${randomUUID()}.png`
    const [row] = await db`
        INSERT INTO files (original_name, stored_name, mime_type, size, uploaded_by)
        VALUES (
            ${overrides.originalName ?? 'test.png'},
            ${storedName},
            ${overrides.mimeType ?? 'image/png'},
            ${overrides.size ?? 1024},
            ${uploadedBy}
        )
        RETURNING
            id,
            original_name AS "originalName",
            stored_name AS "storedName",
            mime_type AS "mimeType",
            size,
            uploaded_by AS "uploadedBy",
            created_at AS "createdAt"
    `
    return row as {
        id: string
        originalName: string
        storedName: string
        mimeType: string
        size: number
        uploadedBy: string
        createdAt: string
    }
}
