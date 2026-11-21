import { randomUUID } from 'node:crypto'
import { log } from 'utils/logger'
import {
    MAX_ELEMENTS_PER_MESSAGE,
    MAX_FILES_PER_MESSAGE,
    MAX_INVALID_MESSAGES,
    MAX_MESSAGES_PER_WINDOW,
    MAX_RATE_LIMITED_WINDOWS,
    MAX_ROOM_ELEMENTS,
    MIN_CURSOR_INTERVAL_MS,
    RATE_WINDOW_MS,
    SAVE_DEBOUNCE_MS,
    SAVE_MAX_WAIT_MS,
    SWEEP_INTERVAL_MS,
} from './limits'
import { chunkFiles, diffSync, mergeElements, mergeFiles, orderElements } from './merge'
import type {
    IncomingWhiteboardMessage,
    OutgoingWhiteboardMessage,
    WhiteboardElement,
    WhiteboardFile,
} from './models'
import { WhiteboardService } from './services'

interface Socket {
    send(data: string): number | void
    close(code?: number, reason?: string): void
}

export interface RoomConnection {
    id: string
    ws: Socket
    userId: string
    userName: string
    closed: boolean
    windowStart: number
    windowCount: number
    windowExceeded: boolean
    limitedWindows: number
    lastCursorAt: number
    invalidCount: number
}

export interface Room {
    appointmentId: string
    elements: Map<string, WhiteboardElement>
    files: Map<string, WhiteboardFile>
    connections: Set<RoomConnection>
    /** Rises each time the merge changes an element. Compared with `savedRevision` to find unsaved work. */
    revision: number
    savedRevision: number
    /** Files that were added to the room and are not stored yet. */
    unsavedFiles: Map<string, WhiteboardFile>
    /** Time of the first change since the last save started. Bounds the debounce. */
    dirtySince: number | null
    timer: Timer | null
    saving: Promise<void> | null
    /** The appointment ended. The room never saves again. */
    ended: boolean
}

const rooms = new Map<string, Room>()
const loading = new Map<string, Promise<Room>>()

const isDirty = (room: Room): boolean =>
    room.revision !== room.savedRevision || room.unsavedFiles.size > 0

const clearTimer = (room: Room): void => {
    if (room.timer) clearTimeout(room.timer)
    room.timer = null
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/**
 * Schedules a save. Each change restarts the debounce, but the wait never goes past
 * `SAVE_MAX_WAIT_MS` after the first unsaved change, so constant drawing still saves.
 */
const scheduleSave = (room: Room): void => {
    if (room.ended) return
    const now = Date.now()
    room.dirtySince ??= now
    const untilMaxWait = Math.max(0, room.dirtySince + SAVE_MAX_WAIT_MS - now)
    clearTimer(room)
    room.timer = setTimeout(
        () => {
            room.timer = null
            persist(room).catch((err) => {
                log.error('[Whiteboard] Failed to save state', {
                    appointmentId: room.appointmentId,
                    err,
                })
            })
        },
        Math.min(SAVE_DEBOUNCE_MS, untilMaxWait),
    )
}

/**
 * Runs one save at a time for the room. A caller that arrives during a save gets the
 * same promise. A change that arrives during a save schedules the next save.
 */
const persist = (room: Room): Promise<void> => {
    if (room.saving) return room.saving
    if (room.ended || !isDirty(room)) return Promise.resolve()

    clearTimer(room)
    const revision = room.revision
    const files = [...room.unsavedFiles.values()]
    const elements = orderElements(room.elements.values())
    room.dirtySince = null

    room.saving = WhiteboardService.saveState(room.appointmentId, elements, files)
        .then(() => {
            room.savedRevision = revision
            for (const file of files) {
                if (room.unsavedFiles.get(file.id) === file) room.unsavedFiles.delete(file.id)
            }
            if (isDirty(room) && !room.timer) scheduleSave(room)
        })
        .catch((err) => {
            // Keep the work marked as unsaved. The sweeper retries.
            room.dirtySince ??= Date.now()
            throw err
        })
        .finally(() => {
            room.saving = null
        })
    return room.saving
}

/** Saves until nothing is left unsaved, or the save fails. */
const flushRoom = async (room: Room): Promise<void> => {
    for (let attempt = 0; attempt < 5 && !room.ended; attempt++) {
        await persist(room)
        if (!isDirty(room)) return
    }
}

const evictIfIdle = (room: Room): void => {
    if (room.connections.size > 0 || isDirty(room) || room.saving) return
    clearTimer(room)
    if (rooms.get(room.appointmentId) === room) rooms.delete(room.appointmentId)
}

const settleEmptyRoom = async (room: Room): Promise<void> => {
    try {
        await flushRoom(room)
    } catch (err) {
        // The room stays in memory with its unsaved work. The sweeper retries and evicts it later.
        log.error('[Whiteboard] Failed to save state on last leave', {
            appointmentId: room.appointmentId,
            err,
        })
    }
    evictIfIdle(room)
}

// ---------------------------------------------------------------------------
// Room lifecycle
// ---------------------------------------------------------------------------

const loadRoom = async (appointmentId: string): Promise<Room> => {
    const state = await WhiteboardService.loadState(appointmentId)
    const room: Room = {
        appointmentId,
        elements: new Map(),
        files: new Map(Object.entries(state.files)),
        connections: new Set(),
        revision: 0,
        savedRevision: 0,
        unsavedFiles: new Map(),
        dirtySince: null,
        timer: null,
        saving: null,
        ended: false,
    }
    for (const element of state.elements) {
        if (room.elements.size >= MAX_ROOM_ELEMENTS) break
        room.elements.set(element.id, element)
    }
    rooms.set(appointmentId, room)
    return room
}

// Concurrent first joins share one load. This closes the race where two loads
// each created a room and the second replaced the first.
const getRoom = (appointmentId: string): Promise<Room> | Room => {
    const existing = rooms.get(appointmentId)
    if (existing) return existing
    let pending = loading.get(appointmentId)
    if (!pending) {
        pending = loadRoom(appointmentId).finally(() => loading.delete(appointmentId))
        loading.set(appointmentId, pending)
    }
    return pending
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

const sendTo = (conn: RoomConnection, message: OutgoingWhiteboardMessage): void => {
    if (conn.closed) return
    try {
        // Bun returns 0 when it dropped the message. The client would miss an update
        // with no way to notice, so close and let it reconnect and sync.
        if (conn.ws.send(JSON.stringify(message)) === 0) {
            conn.ws.close(1013, 'Backpressure')
        }
    } catch (err) {
        log.warn('[Whiteboard] Failed to send message', { connectionId: conn.id, err })
    }
}

const broadcast = (
    room: Room,
    sender: RoomConnection,
    message: OutgoingWhiteboardMessage,
): void => {
    for (const conn of room.connections) {
        if (conn !== sender) sendTo(conn, message)
    }
}

const closeConnection = (conn: RoomConnection, code: number, reason: string): void => {
    try {
        conn.ws.close(code, reason)
    } catch {
        // The socket is already closed.
    }
}

const noteInvalid = (conn: RoomConnection, count: number): void => {
    conn.invalidCount += count
    if (conn.invalidCount > MAX_INVALID_MESSAGES) {
        closeConnection(conn, 1008, 'InvalidMessages')
    }
}

/** Returns false when the connection sent too many messages in the current window. */
const allowMessage = (conn: RoomConnection): boolean => {
    const now = Date.now()
    if (now - conn.windowStart >= RATE_WINDOW_MS) {
        conn.limitedWindows = conn.windowExceeded ? conn.limitedWindows + 1 : 0
        conn.windowStart = now
        conn.windowCount = 0
        conn.windowExceeded = false
        if (conn.limitedWindows >= MAX_RATE_LIMITED_WINDOWS) {
            closeConnection(conn, 1008, 'RateLimited')
            return false
        }
    }
    conn.windowCount++
    if (conn.windowCount > MAX_MESSAGES_PER_WINDOW) {
        conn.windowExceeded = true
        return false
    }
    return true
}

const handleMessage = (
    room: Room,
    conn: RoomConnection,
    message: IncomingWhiteboardMessage,
): void => {
    if (room.ended || conn.closed || !allowMessage(conn)) return

    switch (message.type) {
        case 'elements': {
            if (message.elements.length > MAX_ELEMENTS_PER_MESSAGE) {
                noteInvalid(conn, message.elements.length)
                return
            }
            const { accepted, stale, rejected } = mergeElements(room.elements, message.elements)
            if (rejected > 0) noteInvalid(conn, rejected)
            if (accepted.length > 0) {
                room.revision++
                scheduleSave(room)
                broadcast(room, conn, { type: 'elements', elements: accepted })
            }
            // The sender missed an update. Send it the newer server copies.
            if (stale.length > 0) sendTo(conn, { type: 'elements', elements: stale })
            return
        }

        case 'files': {
            if (Object.keys(message.files).length > MAX_FILES_PER_MESSAGE) {
                noteInvalid(conn, 1)
                return
            }
            const { added, rejected } = mergeFiles(room.files, message.files)
            if (rejected > 0) noteInvalid(conn, rejected)
            const addedFiles = Object.values(added)
            if (addedFiles.length > 0) {
                for (const file of addedFiles) room.unsavedFiles.set(file.id, file)
                scheduleSave(room)
                broadcast(room, conn, { type: 'files', files: added })
            }
            return
        }

        case 'sync': {
            const versionIds = Object.keys(message.versions)
            if (versionIds.length > MAX_ROOM_ELEMENTS) {
                noteInvalid(conn, 1)
                return
            }
            const diff = diffSync(room.elements, room.files, message.versions, message.fileIds)
            // Files go first so an image element never arrives before its file.
            for (const files of chunkFiles(diff.missingFiles)) {
                sendTo(conn, { type: 'files', files })
            }
            sendTo(conn, {
                type: 'sync_reply',
                elements: diff.elements,
                want: diff.want,
                wantFiles: diff.wantFiles,
            })
            return
        }

        case 'cursor': {
            const now = Date.now()
            if (now - conn.lastCursorAt < MIN_CURSOR_INTERVAL_MS) return
            conn.lastCursorAt = now
            broadcast(room, conn, {
                type: 'cursor',
                x: message.x,
                y: message.y,
                userId: conn.userId,
                userName: conn.userName,
                connectionId: conn.id,
            })
            return
        }
    }
}

// ---------------------------------------------------------------------------
// Background tasks
// ---------------------------------------------------------------------------

const sweep = (): void => {
    for (const room of [...rooms.values()]) {
        if (isDirty(room) && !room.saving && !room.timer && !room.ended) {
            persist(room).catch((err) => {
                log.error('[Whiteboard] Failed to save state in sweep', {
                    appointmentId: room.appointmentId,
                    err,
                })
            })
        }
        evictIfIdle(room)
    }
}

const backgroundStarted = Symbol.for('helpsycho.whiteboard.background')

export const WhiteboardRooms = {
    createConnection(ws: Socket, userId: string, userName: string): RoomConnection {
        return {
            id: randomUUID(),
            ws,
            userId,
            userName,
            closed: false,
            windowStart: Date.now(),
            windowCount: 0,
            windowExceeded: false,
            limitedWindows: 0,
            lastCursorAt: 0,
            invalidCount: 0,
        }
    },

    /** Adds the connection to its room. Returns null if the connection closed or the room ended during the load. */
    async join(appointmentId: string, conn: RoomConnection): Promise<Room | null> {
        const room = await getRoom(appointmentId)
        if (conn.closed || room.ended) {
            evictIfIdle(room)
            return null
        }
        room.connections.add(conn)
        return room
    },

    handle: handleMessage,

    /** Counts a message that failed validation. Closes the connection after too many. */
    rejectMessage(conn: RoomConnection): void {
        noteInvalid(conn, 1)
    },

    leave(room: Room, conn: RoomConnection): void {
        conn.closed = true
        if (!room.connections.delete(conn)) return
        broadcast(room, conn, { type: 'leave', userId: conn.userId, connectionId: conn.id })
        if (room.connections.size === 0) void settleEmptyRoom(room)
    },

    /** Closes the room for an ended appointment. Drops unsaved state and closes every socket. */
    async closeRoom(appointmentId: string): Promise<void> {
        const pendingLoad = loading.get(appointmentId)
        if (pendingLoad) await pendingLoad.catch(() => undefined)
        const room = rooms.get(appointmentId)
        if (!room) return

        room.ended = true
        clearTimer(room)
        rooms.delete(appointmentId)
        for (const conn of room.connections) {
            conn.closed = true
            closeConnection(conn, 1000, 'AppointmentEnded')
        }
        room.connections.clear()
        // Wait for a save that already started, so it cannot land after the state is cleared.
        if (room.saving) await room.saving.catch(() => undefined)
    },

    /** Saves every room. Called on shutdown. */
    async flushAll(): Promise<void> {
        await Promise.all(
            [...rooms.values()].map((room) =>
                flushRoom(room).catch((err) => {
                    log.error('[Whiteboard] Failed to save state on shutdown', {
                        appointmentId: room.appointmentId,
                        err,
                    })
                }),
            ),
        )
    },

    /** Starts the sweeper and the shutdown flush. Safe to call more than once. */
    startBackgroundTasks(): void {
        const globals = globalThis as Record<symbol, unknown>
        if (globals[backgroundStarted]) return
        globals[backgroundStarted] = true

        setInterval(sweep, SWEEP_INTERVAL_MS).unref()

        const shutdown = () => {
            void WhiteboardRooms.flushAll().finally(() => process.exit(0))
        }
        process.once('SIGTERM', shutdown)
        process.once('SIGINT', shutdown)
    },

    /** Runs one save pass now. Used by tests so they need not wait for timers. */
    sweepNow: sweep,

    /** Test helper: the number of rooms in memory. */
    roomCount: () => rooms.size,
} as const
