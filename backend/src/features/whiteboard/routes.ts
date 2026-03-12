import { Hono } from 'hono'
import { auth } from 'utils/auth'
import { upgradeWebSocket } from 'config/websocket'
import { findAppointmentByIdForParticipant } from '../appointments/services'

interface RoomConnection {
    ws: ServerWebSocket<unknown>
    userId: string
}

interface Room {
    connections: Set<RoomConnection>
    lastElements: unknown[]
    lastFiles: Record<string, unknown>
}

const rooms = new Map<string, Room>()

export const whiteboardRoutes = new Hono()

whiteboardRoutes.get(
    '/:appointmentId',
    upgradeWebSocket(async (c) => {
        const appointmentId = c.req.param('appointmentId')

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
                thisConnection = { ws: rawWs, userId }

                if (!rooms.has(appointmentId)) {
                    rooms.set(appointmentId, {
                        connections: new Set(),
                        lastElements: [],
                        lastFiles: {},
                    })
                }
                const room = rooms.get(appointmentId)!
                room.connections.add(thisConnection)

                // Replay last known scene to the new connection
                const initMsg = JSON.stringify({
                    type: 'scene_init',
                    elements: room.lastElements,
                    files: room.lastFiles,
                })
                rawWs.send(initMsg)
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

                const parsed = msg as {
                    type: string
                    elements?: unknown[]
                    files?: Record<string, unknown>
                    x?: number
                    y?: number
                }

                // Update cached state
                if (parsed.type === 'elements' && Array.isArray(parsed.elements)) {
                    room.lastElements = parsed.elements
                }
                if (parsed.type === 'files' && parsed.files) {
                    room.lastFiles = { ...room.lastFiles, ...parsed.files }
                }

                // Broadcast to all other connections in this room
                const outgoing = JSON.stringify(
                    parsed.type === 'cursor'
                        ? { ...parsed, userId: thisConnection.userId }
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
                    rooms.delete(appointmentId)
                }
            },
        }
    }),
)
