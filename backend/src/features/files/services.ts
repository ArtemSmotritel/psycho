import type { BunFile } from 'bun'
import { randomUUID } from 'crypto'
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
} as const
