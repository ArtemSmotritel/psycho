import type { BunFile, SQL } from 'bun'
import { randomUUID } from 'crypto'
import { unlink } from 'node:fs/promises'
import { extname } from 'path'
import { NotFoundError } from 'errors/index'
import type { UploadedFile } from './models'
import { FilesRepo } from './repo'

const UPLOAD_DIR = './uploads'

export const FilesService = {
    async uploadForUser(userId: string, file: File): Promise<UploadedFile> {
        const ext = extname(file.name) || ''
        const storedName = `${randomUUID()}${ext}`

        await Bun.write(`${UPLOAD_DIR}/${storedName}`, await file.arrayBuffer())

        const row = await FilesRepo.insert({
            originalName: file.name,
            storedName,
            mimeType: file.type,
            size: file.size,
            uploadedBy: userId,
        })

        return {
            id: row.id,
            url: `/api/files/${row.storedName}`,
            originalName: row.originalName,
            mimeType: row.mimeType,
            size: row.size,
            uploadedAt: row.createdAt,
        }
    },

    async findAccessibleForUser(userId: string, storedName: string): Promise<BunFile> {
        const row = await FilesRepo.findAccessibleByStoredName(storedName, userId)
        if (!row) throw new NotFoundError()

        const bunFile = Bun.file(`${UPLOAD_DIR}/${row.storedName}`)
        if (!(await bunFile.exists())) throw new NotFoundError()

        return bunFile
    },

    // Deletes file rows + disk blobs for the given ids, but only those
    // with no remaining references in attachment_files or associative_images.
    // `tx` MUST be the same transaction that already removed the calling
    // attachment so the cascade has dropped its junction rows first.
    async cleanupOrphans(fileIds: string[], tx: SQL): Promise<void> {
        if (fileIds.length === 0) return

        const orphans = (await tx`
            SELECT f.id, f.stored_name AS "storedName"
            FROM files f
            WHERE f.id IN ${tx(fileIds)}
              AND NOT EXISTS (
                  SELECT 1 FROM attachment_files af WHERE af.file_id = f.id
              )
              AND NOT EXISTS (
                  SELECT 1 FROM associative_images ai WHERE ai.file_id = f.id
              )
        `) as Array<{ id: string; storedName: string }>

        if (orphans.length === 0) return

        await tx`DELETE FROM files WHERE id IN ${tx(orphans.map((o) => o.id))}`

        for (const file of orphans) {
            await FilesService.removeFromDisk(file.storedName)
        }
    },

    async removeFromDisk(storedName: string): Promise<void> {
        const filePath = `${UPLOAD_DIR}/${storedName}`
        try {
            if (await Bun.file(filePath).exists()) {
                await unlink(filePath)
            }
        } catch {
            // file already gone — not critical
        }
    },
} as const
