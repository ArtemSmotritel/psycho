import type { WhiteboardState } from './models'
import { WhiteboardRepo } from './repo'

const emptyState = (): WhiteboardState => ({ elements: [], files: {} })

export const WhiteboardService = {
    async loadState(appointmentId: string): Promise<WhiteboardState> {
        const state = await WhiteboardRepo.findStateByAppointmentId(appointmentId)
        return state ?? emptyState()
    },

    async saveState(appointmentId: string, state: WhiteboardState): Promise<void> {
        await WhiteboardRepo.updateState(appointmentId, state)
    },

    async clearState(appointmentId: string): Promise<void> {
        await WhiteboardRepo.clearState(appointmentId)
    },
} as const
