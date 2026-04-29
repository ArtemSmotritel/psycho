import type { ServerWebSocket } from 'bun'
import { Hono } from 'hono'
import { upgradeWebSocket } from 'config/websocket'
import { auth } from 'utils/auth'
import { log } from 'utils/logger'
import { AppointmentsRepo } from '../appointments/repo'
import type {
    IncomingWhiteboardMessage,
    OutgoingWhiteboardMessage,
    WhiteboardElement,
    WhiteboardState,
} from './models'
import { WhiteboardService } from './services'

interface RoomConnection {
    ws: ServerWebSocket<unknown>
    userId: string
    userName: string
}

interface Room {
    connections: Set<RoomConnection>
    state: WhiteboardState
}

const SAVE_DEBOUNCE_MS = 3000

const rooms = new Map<string, Room>()
const saveTimers = new Map<string, Timer>()

const scheduleSave = (appointmentId: string, room: Room) => {
    const existing = saveTimers.get(appointmentId)
    if (existing) clearTimeout(existing)
    saveTimers.set(
        appointmentId,
        setTimeout(() => {
            saveTimers.delete(appointmentId)
            WhiteboardService.saveState(appointmentId, room.state).catch((err) => {
                log.error('[Whiteboard] Failed to save state', { appointmentId, err })
            })
        }, SAVE_DEBOUNCE_MS),
    )
}

const flushPendingSave = (appointmentId: string, room: Room) => {
    const pending = saveTimers.get(appointmentId)
    if (!pending) return
    clearTimeout(pending)
    saveTimers.delete(appointmentId)
    WhiteboardService.saveState(appointmentId, room.state).catch((err) => {
        log.error('[Whiteboard] Failed to save state on close', { appointmentId, err })
    })
}

const parseMessage = (raw: string): IncomingWhiteboardMessage | null => {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }
    if (!parsed || typeof parsed !== 'object') return null
    const msg = parsed as { type?: unknown }
    switch (msg.type) {
        case 'elements': {
            const m = parsed as { elements?: unknown }
            return Array.isArray(m.elements)
                ? { type: 'elements', elements: m.elements as WhiteboardElement[] }
                : null
        }
        case 'files': {
            const m = parsed as { files?: unknown }
            return m.files && typeof m.files === 'object'
                ? { type: 'files', files: m.files as Record<string, unknown> }
                : null
        }
        case 'cursor': {
            const m = parsed as { x?: unknown; y?: unknown }
            return typeof m.x === 'number' && typeof m.y === 'number'
                ? { type: 'cursor', x: m.x, y: m.y }
                : null
        }
        default:
            return null
    }
}

const broadcast = (
    room: Room,
    sender: RoomConnection,
    message: OutgoingWhiteboardMessage,
): void => {
    const payload = JSON.stringify(message)
    for (const conn of room.connections) {
        if (conn !== sender) conn.ws.send(payload)
    }
}

export const whiteboardRoutes = new Hono()

whiteboardRoutes.get(
    '/:appointmentId',
    upgradeWebSocket(async (c) => {
        const appointmentId = c.req.param('appointmentId')!

        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session) {
            return {
                onOpen(_, ws) {
                    ws.close(1008, 'Unauthorized')
                },
                onMessage() {},
                onClose() {},
            }
        }

        const userId = session.user.id
        const userName = session.user.name ?? 'Anonymous'
        const appointment = await AppointmentsRepo.findByIdForParticipant(appointmentId, userId)

        if (!appointment || appointment.status !== 'active') {
            return {
                onOpen(_, ws) {
                    ws.close(1008, appointment ? 'AppointmentNotActive' : 'NotFound')
                },
                onMessage() {},
                onClose() {},
            }
        }

        let thisConnection: RoomConnection | null = null

        return {
            onOpen(_, ws) {
                const rawWs = ws.raw as ServerWebSocket<unknown>
                thisConnection = { ws: rawWs, userId, userName }

                const initRoom = async () => {
                    let room = rooms.get(appointmentId)
                    if (!room) {
                        const state = await WhiteboardService.loadState(appointmentId)
                        room = { connections: new Set(), state }
                        rooms.set(appointmentId, room)
                    }
                    room.connections.add(thisConnection!)

                    const initMessage: OutgoingWhiteboardMessage = {
                        type: 'scene_init',
                        elements: room.state.elements,
                        files: room.state.files,
                    }
                    rawWs.send(JSON.stringify(initMessage))
                }

                initRoom().catch((err) => {
                    log.error('[Whiteboard] Failed to init room', { appointmentId, err })
                    rawWs.close(1011, 'InternalError')
                })
            },

            onMessage(event, _ws) {
                if (!thisConnection) return
                const room = rooms.get(appointmentId)
                if (!room) return

                const msg = parseMessage(event.data.toString())
                if (!msg) return

                if (msg.type === 'elements') {
                    room.state.elements = msg.elements
                    scheduleSave(appointmentId, room)
                    broadcast(room, thisConnection, msg)
                    return
                }

                if (msg.type === 'files') {
                    room.state.files = { ...room.state.files, ...msg.files }
                    scheduleSave(appointmentId, room)
                    broadcast(room, thisConnection, msg)
                    return
                }

                broadcast(room, thisConnection, {
                    type: 'cursor',
                    x: msg.x,
                    y: msg.y,
                    userId: thisConnection.userId,
                    userName: thisConnection.userName,
                })
            },

            onClose() {
                if (!thisConnection) return
                const room = rooms.get(appointmentId)
                if (!room) return
                room.connections.delete(thisConnection)
                if (room.connections.size === 0) {
                    flushPendingSave(appointmentId, room)
                    rooms.delete(appointmentId)
                }
            },
        }
    }),
)
