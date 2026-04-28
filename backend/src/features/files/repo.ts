import { db } from 'config/db'
import type { FileEntity } from './models'

const columns = `id, original_name AS "originalName", stored_name AS "storedName", mime_type AS "mimeType", size, uploaded_by AS "uploadedBy", created_at AS "createdAt"`

export const FilesRepo = {
    async insert(params: {
        originalName: string
        storedName: string
        mimeType: string
        size: number
        uploadedBy: string
    }): Promise<FileEntity> {
        const [row] = await db`
            INSERT INTO files (original_name, stored_name, mime_type, size, uploaded_by)
            VALUES (
                ${params.originalName},
                ${params.storedName},
                ${params.mimeType},
                ${params.size},
                ${params.uploadedBy}
            )
            RETURNING ${db.unsafe(columns)}
        `
        return row as FileEntity
    },

    async findAccessibleByStoredName(
        storedName: string,
        userId: string,
    ): Promise<FileEntity | null> {
        const [row] = await db`
            SELECT ${db.unsafe(columns)}
            FROM files f
            WHERE f.stored_name = ${storedName}
              AND (
                f.uploaded_by = ${userId}
                OR EXISTS (
                  SELECT 1
                  FROM attachment_files af
                  JOIN attachments a ON a.id = af.attachment_id
                  JOIN appointments ap ON ap.id = a.appointment_id
                  WHERE af.file_id = f.id
                    AND (ap.psycho_id = ${userId} OR ap.client_id = ${userId})
                )
              )
        `
        return (row as FileEntity) ?? null
    },
} as const
