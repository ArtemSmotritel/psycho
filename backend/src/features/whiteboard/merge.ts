import {
    FILES_CHUNK_BYTES,
    MAX_ELEMENT_ID_LENGTH,
    MAX_FILE_BYTES,
    MAX_ROOM_ELEMENTS,
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
    for (const [fileId, raw] of Object.entries(incoming)) {
        const file = parseFile(fileId, raw)
        if (!file) {
            rejected++
            continue
        }
        // A file id identifies immutable content. An existing id is never replaced.
        if (current.has(fileId)) continue
        if (current.size >= MAX_ROOM_FILES) {
            rejected++
            continue
        }
        current.set(fileId, file)
        added[fileId] = file
    }
    return { added, rejected }
}

/**
 * Orders elements by their fractional `index`. Elements without an index (old clients)
 * keep their insertion order and go after the indexed ones.
 */
export const orderElements = (elements: Iterable<WhiteboardElement>): WhiteboardElement[] => {
    const indexed: WhiteboardElement[] = []
    const unindexed: WhiteboardElement[] = []
    for (const element of elements) {
        if (typeof element.index === 'string') indexed.push(element)
        else unindexed.push(element)
    }
    indexed.sort((a, b) => {
        const left = a.index as string
        const right = b.index as string
        return left < right ? -1 : left > right ? 1 : 0
    })
    return [...indexed, ...unindexed]
}

export interface SyncDiff {
    /** Server elements that the client lacks or holds at an older revision. */
    elements: WhiteboardElement[]
    /** Ids for which the client holds a newer revision, or that the server lacks. */
    want: string[]
    /** Server files that the client lacks. */
    missingFiles: WhiteboardFiles
    /** File ids that the client holds and the server lacks. */
    wantFiles: string[]
}

export const diffSync = (
    elements: Map<string, WhiteboardElement>,
    files: Map<string, WhiteboardFile>,
    clientVersions: Record<string, ElementVersion>,
    clientFileIds: readonly string[],
): SyncDiff => {
    const send: WhiteboardElement[] = []
    const want: string[] = []

    for (const element of elements.values()) {
        const clientVersion = clientVersions[element.id]
        if (!clientVersion) {
            send.push(element)
            continue
        }
        const serverVersion = versionOf(element)
        if (decide(clientVersion, serverVersion) === 'accept') send.push(element)
        else if (decide(serverVersion, clientVersion) === 'accept') want.push(element.id)
    }
    for (const id of Object.keys(clientVersions)) {
        if (!elements.has(id)) want.push(id)
    }

    const clientFiles = new Set(clientFileIds)
    const missingFiles: WhiteboardFiles = {}
    for (const [fileId, file] of files) {
        if (!clientFiles.has(fileId)) missingFiles[fileId] = file
    }
    const wantFiles = clientFileIds.filter((fileId) => !files.has(fileId))

    return { elements: orderElements(send), want, missingFiles, wantFiles }
}

/** Splits files into groups whose payload stays near `maxBytes`. A single large file gets its own group. */
export const chunkFiles = (
    files: WhiteboardFiles,
    maxBytes: number = FILES_CHUNK_BYTES,
): WhiteboardFiles[] => {
    const chunks: WhiteboardFiles[] = []
    let current: WhiteboardFiles = {}
    let currentBytes = 0
    for (const [fileId, file] of Object.entries(files)) {
        const size = file.dataURL.length
        if (currentBytes > 0 && currentBytes + size > maxBytes) {
            chunks.push(current)
            current = {}
            currentBytes = 0
        }
        current[fileId] = file
        currentBytes += size
    }
    if (currentBytes > 0 || Object.keys(current).length > 0) chunks.push(current)
    return chunks
}
