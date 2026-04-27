import { db } from 'config/db'
import { NotFoundError } from 'errors/index'
import { randomUUID } from 'crypto'
import { extname } from 'path'
import type { BunFile } from 'bun'

export interface UploadedFile {
    id: string
    url: string
    originalName: string
    mimeType: string
    size: number
    uploadedAt: string
}

export async function uploadFile(userId: string, file: File): Promise<UploadedFile> {
    const ext = extname(file.name) || ''
    const storedName = `${randomUUID()}${ext}`
    const filePath = `./uploads/${storedName}`

    await Bun.write(filePath, await file.arrayBuffer())

    const [row] = await db`
        INSERT INTO files (original_name, stored_name, mime_type, size, uploaded_by)
        VALUES (${file.name}, ${storedName}, ${file.type}, ${file.size}, ${userId})
        RETURNING
            id,
            original_name AS "originalName",
            stored_name AS "storedName",
            mime_type AS "mimeType",
            size,
            uploaded_by AS "uploadedBy",
            created_at AS "createdAt"
    `

    return {
        id: row.id,
        url: `/api/files/${storedName}`,
        originalName: row.originalName,
        mimeType: row.mimeType,
        size: row.size,
        uploadedAt: row.createdAt,
    }
}

export async function findAccessibleFile(userId: string, filename: string): Promise<BunFile> {
    const [allowed] = await db`
        SELECT 1 FROM files f
        WHERE f.stored_name = ${filename}
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

    if (!allowed) {
        throw new NotFoundError()
    }

    const bunFile = Bun.file(`./uploads/${filename}`)
    if (!(await bunFile.exists())) {
        throw new NotFoundError()
    }

    return bunFile
}
