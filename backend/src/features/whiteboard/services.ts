import { db } from 'config/db'
import type { WhiteboardElement, WhiteboardFile, WhiteboardState } from './models'
import { WhiteboardRepo } from './repo'

const emptyState = (): WhiteboardState => ({ elements: [], files: {} })

export const WhiteboardService = {
    async loadState(appointmentId: string): Promise<WhiteboardState> {
        const state = await WhiteboardRepo.findStateByAppointmentId(appointmentId)
        return state ?? emptyState()
    },

    // Writes the elements and any files that are not stored yet in one transaction.
    // Files never change after they are stored, so an empty `newFiles` costs nothing extra.
    async saveState(
        appointmentId: string,
        elements: WhiteboardElement[],
        newFiles: WhiteboardFile[],
    ): Promise<void> {
        await db.begin(async (tx) => {
            for (const file of newFiles) {
                await WhiteboardRepo.insertFile(appointmentId, file, tx)
            }
            await WhiteboardRepo.updateElements(appointmentId, elements, tx)
        })
    },

    async clearState(appointmentId: string): Promise<void> {
        await WhiteboardRepo.clearState(appointmentId)
    },
} as const
