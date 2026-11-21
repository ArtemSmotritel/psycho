import {
    MAX_ELEMENT_ID_LENGTH,
    MAX_FILE_BYTES,
    MAX_ROOM_ELEMENTS,
    MAX_ROOM_FILE_BYTES,
    MAX_ROOM_FILES,
} from './limits'
import type { ElementVersion, WhiteboardElement, WhiteboardFile, WhiteboardFiles } from './models'

export type MergeDecision = 'accept' | 'keep' | 'duplicate'

/**
 * Decides whether an incoming revision replaces the current one.
 * Same rule as Excalidraw's `reconcileElements`: the higher `version` wins and, on a tie,
 * the lower `versionNonce` wins. Server and clients must apply the same rule or they diverge.
 */
export const decide = (current: ElementVersion, incoming: ElementVersion): MergeDecision => {
    const [curVersion, curNonce] = current
    const [incVersion, incNonce] = incoming
    if (incVersion > curVersion) return 'accept'
    if (incVersion < curVersion) return 'keep'
    if (incNonce === curNonce) return 'duplicate'
    return incNonce < curNonce ? 'accept' : 'keep'
}

const isInt = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseElement = (raw: unknown): WhiteboardElement | null => {
    if (!isObject(raw)) return null
    const { id, version, versionNonce, index } = raw
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_ELEMENT_ID_LENGTH) return null
    if (!isInt(version)) return null
    if (typeof versionNonce !== 'number' || !Number.isSafeInteger(versionNonce)) return null
    if (index !== undefined && index !== null && typeof index !== 'string') return null
    return raw as WhiteboardElement
}

export const versionOf = (element: WhiteboardElement): ElementVersion => [
    element.version,
    element.versionNonce,
]

export const parseFile = (fileId: string, raw: unknown): WhiteboardFile | null => {
    if (fileId.length === 0 || fileId.length > MAX_ELEMENT_ID_LENGTH) return null
    if (!isObject(raw)) return null
    if (raw.id !== fileId) return null
    if (typeof raw.dataURL !== 'string' || raw.dataURL.length > MAX_FILE_BYTES) return null
    return raw as WhiteboardFile
}

export interface MergeResult {
    /** Elements that changed the room state. Broadcast these to the other connections. */
    accepted: WhiteboardElement[]
    /** Server copies that beat the sender's revision. Send these back to the sender only. */
    stale: WhiteboardElement[]
    /** Count of elements that failed validation or exceeded a limit. */
    rejected: number
}

export const mergeElements = (
    current: Map<string, WhiteboardElement>,
    incoming: readonly unknown[],
): MergeResult => {
    const accepted = new Map<string, WhiteboardElement>()
    const stale = new Map<string, WhiteboardElement>()
    let rejected = 0

    for (const raw of incoming) {
        const element = parseElement(raw)
        if (!element) {
            rejected++
            continue
        }
        const existing = current.get(element.id)
        if (!existing) {
            if (current.size >= MAX_ROOM_ELEMENTS) {
                rejected++
                continue
            }
            current.set(element.id, element)
            accepted.set(element.id, element)
            stale.delete(element.id)
            continue
        }
        const decision = decide(versionOf(existing), versionOf(element))
        if (decision === 'accept') {
            current.set(element.id, element)
            accepted.set(element.id, element)
            stale.delete(element.id)
        } else if (decision === 'keep' && !accepted.has(element.id)) {
            // A copy accepted earlier in this batch is the current copy, so the sender needs
            // no correction. Otherwise the sender holds an older revision than the server.
            stale.set(element.id, existing)
        }
    }

    return { accepted: [...accepted.values()], stale: [...stale.values()], rejected }
}

export const mergeFiles = (
    current: Map<string, WhiteboardFile>,
    incoming: Record<string, unknown>,
): { added: WhiteboardFiles; rejected: number } => {
    const added: WhiteboardFiles = {}
    let rejected = 0
    let roomBytes = 0
    for (const file of current.values()) roomBytes += file.dataURL.length
    for (const [fileId, raw] of Object.entries(incoming)) {
        const file = parseFile(fileId, raw)
        if (!file) {
            rejected++
            continue
        }
        // A file id identifies immutable content. An existing id is never replaced.
        if (current.has(fileId)) continue
        if (
            current.size >= MAX_ROOM_FILES ||
            roomBytes + file.dataURL.length > MAX_ROOM_FILE_BYTES
        ) {
            rejected++
            continue
        }
        roomBytes += file.dataURL.length
        current.set(fileId, file)
        added[fileId] = file
    }
    return { added, rejected }
}

export interface FileDiff {
    /** Server files that the client lacks. */
    missing: WhiteboardFiles
    /** File ids that the client holds and the server lacks. */
    wanted: string[]
}

export const diffFiles = (
    files: Map<string, WhiteboardFile>,
    clientFileIds: readonly string[],
): FileDiff => {
    const clientFiles = new Set(clientFileIds)
    const missing: WhiteboardFiles = {}
    for (const [fileId, file] of files) {
        if (!clientFiles.has(fileId)) missing[fileId] = file
    }
    const wanted = clientFileIds.filter((fileId) => !files.has(fileId))
    return { missing, wanted }
}
