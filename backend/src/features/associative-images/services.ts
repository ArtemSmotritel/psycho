import { db } from 'config/db'
import { ForbiddenError, NotFoundError } from 'errors/index'
import { FilesRepo } from '../files/repo'
import { FilesService } from '../files/services'
import type { AssociativeImage, AssociativeImagesList } from './models'
import { AssociativeImagesRepo } from './repo'

export const AssociativeImagesService = {
    async listForPsycho(
        psychoId: string,
        opts: { search: string; limit: number; offset: number },
    ): Promise<AssociativeImagesList> {
        const search = opts.search?.trim()
        const limit = opts.limit
        const offset = opts.offset
        const [images, total] = await Promise.all([
            AssociativeImagesRepo.listByPsychologist(psychoId, { search, limit, offset }),
            AssociativeImagesRepo.countByPsychologist(psychoId, search),
        ])
        return { images, total }
    },

    async createForPsycho(params: {
        psychoId: string
        name: string
        fileId: string
    }): Promise<AssociativeImage> {
        const file = await FilesRepo.findById(params.fileId)
        if (!file || file.uploadedBy !== params.psychoId) {
            throw new ForbiddenError('File not found or not owned by you.', 'FileNotOwned')
        }
        return AssociativeImagesRepo.insert({
            psychologistId: params.psychoId,
            name: params.name,
            fileId: params.fileId,
        })
    },

    async renameForPsycho(id: string, psychoId: string, name: string): Promise<AssociativeImage> {
        const existing = await AssociativeImagesRepo.findByIdForPsycho(id, psychoId)
        if (!existing) throw new NotFoundError()
        await AssociativeImagesRepo.updateName(id, name)
        const updated = await AssociativeImagesRepo.findById(id)
        return updated as AssociativeImage
    },

    async deleteForPsycho(id: string, psychoId: string): Promise<void> {
        const image = await AssociativeImagesRepo.findByIdForPsycho(id, psychoId)
        if (!image) throw new NotFoundError()
        const file = await FilesRepo.findById(image.fileId)
        await db.begin(async (tx) => {
            await AssociativeImagesRepo.deleteById(id, tx)
            await FilesService.cleanupOrphans([image.fileId], tx)
        })
        if (file) {
            await FilesService.removeFromDisk(file.storedName)
        }
    },
} as const
