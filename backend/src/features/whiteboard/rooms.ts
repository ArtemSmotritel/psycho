import { randomUUID } from 'node:crypto'
import { log } from 'utils/logger'
import {
    MAX_ELEMENTS_PER_MESSAGE,
    MAX_INVALID_MESSAGES,
    MAX_MESSAGES_PER_WINDOW,
    MAX_ROOM_ELEMENTS,
    RATE_WINDOW_MS,
    SAVE_DELAY_MS,
    SAVE_RETRY_MS,
} from './limits'
import { diffFiles, mergeElements, mergeFiles } from './merge'
import type {
    IncomingWhiteboardMessage,
    OutgoingWhiteboardMessage,
    WhiteboardElement,
    WhiteboardFile,
} from './models'
import { WhiteboardService } from './services'

interface Socket {
    send(data: string): void
    close(code?: number, reason?: string): void
}

export interface RoomConnection {
    id: string
    ws: Socket
    userName: string
    closed: boolean
    windowStart: number
    windowCount: number
    invalidCount: number
}

export interface Room {
    appointmentId: string
    elements: Map<string, WhiteboardElement>
    files: Map<string, WhiteboardFile>
    connections: Set<RoomConnection>
    /** True when the room holds a change that no save has stored yet. */
    dirty: boolean
    /** Files that were added to the room and are not stored yet. */
    unsavedFiles: Map<string, WhiteboardFile>
    timer: Timer | null
    saving: Promise<void> | null
    /** The appointment ended. The room never saves again. */
    ended: boolean
}

const rooms = new Map<string, Room>()
const loading = new Map<string, Promise<Room>>()

const clearTimer = (room: Room): void => {
    if (room.timer) clearTimeout(room.timer)
    room.timer = null
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/**
 * Starts the save timer on the first unsaved change. Later changes do not restart it,
 * so constant drawing still saves.
 */
const scheduleSave = (room: Room, delay: number = SAVE_DELAY_MS): void => {
    if (room.ended || room.timer) return
    room.timer = setTimeout(() => {
        room.timer = null
        persist(room).catch((err) => {
            log.error('[Whiteboard] Failed to save state', {
                appointmentId: room.appointmentId,
                err,
            })
        })
    }, delay)
}

/**
 * Runs one save at a time for the room. A caller that arrives during a save gets the
 * same promise. A change that arrives during a save schedules the next save.
 * A failed save marks the room dirty again and schedules a retry.
 */
const persist = (room: Room): Promise<void> => {
    if (room.saving) return room.saving
    if (room.ended || !room.dirty) return Promise.resolve()

    clearTimer(room)
    room.dirty = false
    const files = [...room.unsavedFiles.values()]
    room.unsavedFiles.clear()
    const elements = [...room.elements.values()]

    room.saving = WhiteboardService.saveState(room.appointmentId, elements, files)
        .then(() => {
            if (room.dirty) scheduleSave(room)
        })
        .catch((err) => {
            room.dirty = true
            for (const file of files) room.unsavedFiles.set(file.id, file)
            scheduleSave(room, SAVE_RETRY_MS)
            throw err
        })
        .finally(() => {
            room.saving = null
            evictIfIdle(room)
        })
    return room.saving
}

/** Saves until nothing is left unsaved, or the save fails. */
const flushRoom = async (room: Room): Promise<void> => {
    for (let attempt = 0; attempt < 5 && !room.ended; attempt++) {
        await persist(room)
        if (!room.dirty) return
    }
}

const evictIfIdle = (room: Room): void => {
    if (room.connections.size > 0 || room.dirty || room.saving) return
    if (rooms.get(room.appointmentId) === room) rooms.delete(room.appointmentId)
}

const settleEmptyRoom = async (room: Room): Promise<void> => {
    try {
        await flushRoom(room)
    } catch (err) {
        // The room stays in memory with its unsaved work. The retry timer saves it and evicts it later.
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
        dirty: false,
        unsavedFiles: new Map(),
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
        // A client that cannot keep up gets disconnected by Bun (`closeOnBackpressureLimit`),
        // so it reconnects and syncs. With that flag, a message that Bun drops means that Bun closed the socket.
        conn.ws.send(JSON.stringify(message))
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
    conn.closed = true
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

/**
 * Returns false and closes the connection when it sent too many messages in the current window.
 * The socket closes instead of dropping messages, so the client reconnects and syncs
 * and never stays out of sync without noticing.
 */
const allowMessage = (conn: RoomConnection): boolean => {
    const now = Date.now()
    if (now - conn.windowStart >= RATE_WINDOW_MS) {
        conn.windowStart = now
        conn.windowCount = 0
    }
    conn.windowCount++
    if (conn.windowCount > MAX_MESSAGES_PER_WINDOW) {
        closeConnection(conn, 1013, 'RateLimited')
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
                room.dirty = true
                scheduleSave(room)
                broadcast(room, conn, { type: 'elements', elements: accepted })
            }
            // The sender missed an update. Send it the newer server copies.
            if (stale.length > 0) sendTo(conn, { type: 'elements', elements: stale })
            return
        }

        case 'files': {
            const { added, rejected } = mergeFiles(room.files, message.files)
            if (rejected > 0) noteInvalid(conn, rejected)
            const addedFiles = Object.values(added)
            if (addedFiles.length > 0) {
                for (const file of addedFiles) room.unsavedFiles.set(file.id, file)
                room.dirty = true
                scheduleSave(room)
                broadcast(room, conn, { type: 'files', files: added })
            }
            return
        }

        case 'sync': {
            const { missing, wanted } = diffFiles(room.files, message.fileIds)
            // Files go first so an image element never arrives before its file.
            for (const [fileId, file] of Object.entries(missing)) {
                sendTo(conn, { type: 'files', files: { [fileId]: file } })
            }
            sendTo(conn, {
                type: 'sync_reply',
                elements: [...room.elements.values()],
                wantFiles: wanted,
            })
            return
        }

        case 'cursor': {
            broadcast(room, conn, {
                type: 'cursor',
                x: message.x,
                y: message.y,
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

const backgroundStarted = Symbol.for('helpsycho.whiteboard.background')

export const WhiteboardRooms = {
    createConnection(ws: Socket, userName: string): RoomConnection {
        return {
            id: randomUUID(),
            ws,
            userName,
            closed: false,
            windowStart: Date.now(),
            windowCount: 0,
            invalidCount: 0,
        }
    },

    /**
     * Adds the connection to its room. Returns null if the room ended during the load.
     * A connection that closed during the load is added too. Its `leave` call removes it and evicts
     * the room if it is idle, so one place owns eviction and a room that other joiners share stays in the map.
     */
    async join(appointmentId: string, conn: RoomConnection): Promise<Room | null> {
        const room = await getRoom(appointmentId)
        if (room.ended) return null
        room.connections.add(conn)
        return room
    },

    handle: handleMessage,

    /** Counts a message that failed validation. Closes the connection after too many. */
    rejectMessage(conn: RoomConnection): void {
        noteInvalid(conn, 1)
    },

    leave(room: Room, conn: RoomConnection): void {
        if (!room.connections.delete(conn)) return
        broadcast(room, conn, { type: 'leave', connectionId: conn.id })
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
        for (const conn of room.connections) closeConnection(conn, 1000, 'AppointmentEnded')
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

    /** Starts the shutdown flush. Safe to call more than once. */
    startBackgroundTasks(): void {
        const globals = globalThis as Record<symbol, unknown>
        if (globals[backgroundStarted]) return
        globals[backgroundStarted] = true

        const shutdown = () => {
            void WhiteboardRooms.flushAll().finally(() => process.exit(0))
        }
        process.once('SIGTERM', shutdown)
        process.once('SIGINT', shutdown)
    },

    /** Test helper: the number of rooms in memory. */
    roomCount: () => rooms.size,
} as const
