import type { SQL } from 'bun'
import { db } from 'config/db'
import type { WhiteboardElement, WhiteboardFile, WhiteboardFiles, WhiteboardState } from './models'

const parseJsonb = <T>(value: T | string | null): T | null => {
    if (value === null) return null
    return typeof value === 'string' ? (JSON.parse(value) as T) : value
}

export const WhiteboardRepo = {
    async findStateByAppointmentId(appointmentId: string): Promise<WhiteboardState | null> {
        const [row] = await db`
            SELECT whiteboard_elements AS "whiteboardElements"
            FROM appointments
            WHERE id = ${appointmentId}
        `
        if (!row) return null

        const fileRows = (await db`
            SELECT file_id AS "fileId", data
            FROM whiteboard_files
            WHERE appointment_id = ${appointmentId}
            ORDER BY created_at, file_id
        `) as { fileId: string; data: string }[]

        const files: WhiteboardFiles = {}
        for (const fileRow of fileRows) {
            files[fileRow.fileId] = JSON.parse(fileRow.data) as WhiteboardFile
        }

        return {
            elements:
                parseJsonb<WhiteboardElement[]>(
                    (row as { whiteboardElements: WhiteboardElement[] | string | null })
                        .whiteboardElements,
                ) ?? [],
            files,
        }
    },

    // The `ended_at IS NULL` guards stop a late save from writing state back
    // to an appointment that already ended and had its whiteboard cleared.
    async updateElements(
        appointmentId: string,
        elements: WhiteboardElement[],
        executor: SQL = db,
    ): Promise<void> {
        await executor`
            UPDATE appointments
            SET whiteboard_elements = ${JSON.stringify(elements)}::jsonb
            WHERE id = ${appointmentId}
              AND ended_at IS NULL
        `
    },

    // FOR UPDATE locks the appointment row until the save commits. The end of the appointment
    // updates the same row, so it waits for this insert, or this insert sees that it ended and adds nothing.
    // Without the lock, a file could commit after the end cleared the files.
    async insertFile(
        appointmentId: string,
        file: WhiteboardFile,
        executor: SQL = db,
    ): Promise<void> {
        await executor`
            INSERT INTO whiteboard_files (appointment_id, file_id, data)
            SELECT id, ${file.id}, ${JSON.stringify(file)}
            FROM appointments
            WHERE id = ${appointmentId}
              AND ended_at IS NULL
            FOR UPDATE
            ON CONFLICT (appointment_id, file_id) DO NOTHING
        `
    },

    async clearState(appointmentId: string, executor: SQL = db): Promise<void> {
        await executor`
            UPDATE appointments
            SET whiteboard_elements = NULL
            WHERE id = ${appointmentId}
        `
        await executor`
            DELETE FROM whiteboard_files
            WHERE appointment_id = ${appointmentId}
        `
    },
} as const
