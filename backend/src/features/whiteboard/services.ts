import { db } from 'config/db'

export async function loadWhiteboardState(
    appointmentId: string,
): Promise<{ elements: unknown[]; files: Record<string, unknown> }> {
    const [row] = await db`
        SELECT whiteboard_elements, whiteboard_files
        FROM appointments
        WHERE id = ${appointmentId}
    `
    const rawElements = row?.whiteboard_elements
    const rawFiles = row?.whiteboard_files

    const elements =
        typeof rawElements === 'string' ? JSON.parse(rawElements) : rawElements
    const files =
        typeof rawFiles === 'string' ? JSON.parse(rawFiles) : rawFiles

    return {
        elements: (elements as unknown[]) ?? [],
        files: (files as Record<string, unknown>) ?? {},
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
