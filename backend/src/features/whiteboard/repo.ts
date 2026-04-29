import type { SQL } from 'bun'
import { db } from 'config/db'
import type { WhiteboardElement, WhiteboardFiles, WhiteboardState } from './models'

interface WhiteboardRow {
    whiteboardElements: WhiteboardElement[] | string | null
    whiteboardFiles: WhiteboardFiles | string | null
}

const parseJsonb = <T>(value: T | string | null): T | null => {
    if (value === null) return null
    return typeof value === 'string' ? (JSON.parse(value) as T) : value
}

export const WhiteboardRepo = {
    async findStateByAppointmentId(appointmentId: string): Promise<WhiteboardState | null> {
        const [row] = await db`
            SELECT whiteboard_elements AS "whiteboardElements",
                   whiteboard_files    AS "whiteboardFiles"
            FROM appointments
            WHERE id = ${appointmentId}
        `
        if (!row) return null
        const r = row as WhiteboardRow
        return {
            elements: parseJsonb<WhiteboardElement[]>(r.whiteboardElements) ?? [],
            files: parseJsonb<WhiteboardFiles>(r.whiteboardFiles) ?? {},
        }
    },

    async updateState(
        appointmentId: string,
        state: WhiteboardState,
        executor: SQL = db,
    ): Promise<void> {
        await executor`
            UPDATE appointments
            SET whiteboard_elements = ${JSON.stringify(state.elements)}::jsonb,
                whiteboard_files    = ${JSON.stringify(state.files)}::jsonb
            WHERE id = ${appointmentId}
        `
    },

    async clearState(appointmentId: string, executor: SQL = db): Promise<void> {
        await executor`
            UPDATE appointments
            SET whiteboard_elements = NULL,
                whiteboard_files    = NULL
            WHERE id = ${appointmentId}
        `
    },
} as const
