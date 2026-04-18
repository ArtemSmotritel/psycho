import { Hono } from 'hono'
import { auth } from 'utils/auth'
import { upgradeWebSocket } from 'config/websocket'
import { findAppointmentByIdForParticipant } from '../appointments/services'
import { loadWhiteboardState, saveWhiteboardState } from './services'
import { log } from 'utils/logger'

interface RoomConnection {
    ws: ServerWebSocket<unknown>
    userId: string
    userName: string
}

interface Room {
    connections: Set<RoomConnection>
    lastElements: unknown[]
    lastFiles: Record<string, unknown>
}

const rooms = new Map<string, Room>()
const saveTimers = new Map<string, Timer>()

export const whiteboardRoutes = new Hono()

whiteboardRoutes.get(
    '/:appointmentId',
    upgradeWebSocket(async (c) => {
        const appointmentId = c.req.param('appointmentId')!

        // Auth: read session from cookie headers
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session) {
            // Cannot reject here with a status code in Hono WS factory;
            // rejection is done in onOpen by closing the socket.
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
        const appointment = await findAppointmentByIdForParticipant(appointmentId, userId)

        if (!appointment || appointment.status !== 'active') {
            return {
                onOpen(_, ws) {
                    ws.close(1008, appointment ? 'AppointmentNotActive' : 'NotFound')
                },
                onMessage() {},
                onClose() {},
            }
        }

        // Return valid handlers
        let thisConnection: RoomConnection | null = null

        return {
            onOpen(_, ws) {
                // Ensure raw Bun WS is used for broadcast
                const rawWs = ws.raw as ServerWebSocket<unknown>
                thisConnection = { ws: rawWs, userId, userName }

                const initRoom = async () => {
                    if (!rooms.has(appointmentId)) {
                        // Load persisted state from DB
                        const state = await loadWhiteboardState(appointmentId)
                        rooms.set(appointmentId, {
                            connections: new Set(),
                            lastElements: state.elements,
                            lastFiles: state.files,
                        })
                    }
                    const room = rooms.get(appointmentId)!
                    room.connections.add(thisConnection!)

                    // Replay last known scene to the new connection
                    const initMsg = JSON.stringify({
                        type: 'scene_init',
                        elements: room.lastElements,
                        files: room.lastFiles,
                    })
                    rawWs.send(initMsg)
                }

                initRoom().catch((err) => {
                    console.error('whiteboard: failed to init room', err)
                    rawWs.close(1011, 'InternalError')
                })
            },

            onMessage(event, _ws) {
                if (!thisConnection) return
                const room = rooms.get(appointmentId)
                if (!room) return

                let msg: unknown
                try {
                    msg = JSON.parse(event.data.toString())
                } catch {
                    return
                }
                log.info('new n', msg)

                const parsed = msg as {
                    type: string
                    elements?: unknown[]
                    files?: Record<string, unknown>
                    x?: number
                    y?: number
                }

                // Update cached state and schedule debounced DB save
                if (parsed.type === 'elements' && Array.isArray(parsed.elements)) {
                    room.lastElements = parsed.elements

                    const existing = saveTimers.get(appointmentId)
                    if (existing) clearTimeout(existing)
                    saveTimers.set(
                        appointmentId,
                        setTimeout(() => {
                            saveTimers.delete(appointmentId)
                            saveWhiteboardState(
                                appointmentId,
                                room.lastElements,
                                room.lastFiles,
                            ).catch((err) => {
                                console.error('whiteboard: failed to save elements', err)
                            })
                        }, 3000),
                    )
                }
                if (parsed.type === 'files' && parsed.files) {
                    room.lastFiles = { ...room.lastFiles, ...parsed.files }

                    const existing = saveTimers.get(appointmentId)
                    if (existing) clearTimeout(existing)
                    saveTimers.set(
                        appointmentId,
                        setTimeout(() => {
                            saveTimers.delete(appointmentId)
                            saveWhiteboardState(
                                appointmentId,
                                room.lastElements,
                                room.lastFiles,
                            ).catch((err) => {
                                console.error('whiteboard: failed to save files', err)
                            })
                        }, 3000),
                    )
                }

                // Broadcast to all other connections in this room
                const outgoing = JSON.stringify(
                    parsed.type === 'cursor'
                        ? {
                              ...parsed,
                              userId: thisConnection.userId,
                              userName: thisConnection.userName,
                          }
                        : parsed,
                )
                for (const conn of room.connections) {
                    if (conn !== thisConnection) {
                        conn.ws.send(outgoing)
                    }
                }
            },

            onClose() {
                if (!thisConnection) return
                const room = rooms.get(appointmentId)
                if (!room) return
                room.connections.delete(thisConnection)
                if (room.connections.size === 0) {
                    // Flush any pending debounced save before discarding the room
                    const pendingTimer = saveTimers.get(appointmentId)
                    if (pendingTimer) {
                        clearTimeout(pendingTimer)
                        saveTimers.delete(appointmentId)
                        saveWhiteboardState(appointmentId, room.lastElements, room.lastFiles).catch(
                            (err) => {
                                console.error('whiteboard: failed to save on close', err)
                            },
                        )
                    }
                    rooms.delete(appointmentId)
                }
            },
        }
    }),
)
