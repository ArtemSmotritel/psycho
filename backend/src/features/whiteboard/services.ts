import { db } from 'config/db'

export async function loadWhiteboardState(
    appointmentId: string,
): Promise<{ elements: unknown[]; files: Record<string, unknown> }> {
    const [row] = await db`
        SELECT whiteboard_elements, whiteboard_files
        FROM appointments
        WHERE id = ${appointmentId}
    `
    return {
        elements: (row?.whiteboard_elements as unknown[]) ?? [],
        files: (row?.whiteboard_files as Record<string, unknown>) ?? {},
    }
}

export async function saveWhiteboardState(
    appointmentId: string,
    elements: unknown[],
    files: Record<string, unknown>,
): Promise<void> {
    await db`
        UPDATE appointments
        SET whiteboard_elements = ${JSON.stringify(elements)}::jsonb,
            whiteboard_files = ${JSON.stringify(files)}::jsonb
        WHERE id = ${appointmentId}
    `
}

export async function clearWhiteboardState(appointmentId: string): Promise<void> {
    await db`
        UPDATE appointments
        SET whiteboard_elements = NULL,
            whiteboard_files = NULL
        WHERE id = ${appointmentId}
    `
}
