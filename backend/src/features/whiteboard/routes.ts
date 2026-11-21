import type { ServerWebSocket } from 'bun'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { upgradeWebSocket } from 'config/websocket'
import { auth } from 'utils/auth'
import { log } from 'utils/logger'
import { AppointmentsService } from '../appointments/services'
import { MAX_ROOM_FILES } from './limits'
import type { IncomingWhiteboardMessage } from './models'
import { WhiteboardRooms, type Room, type RoomConnection } from './rooms'

const incomingMessageSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('sync'),
        fileIds: z.array(z.string()).max(MAX_ROOM_FILES),
    }),
    z.object({ type: z.literal('elements'), elements: z.array(z.unknown()) }),
    z.object({ type: z.literal('files'), files: z.record(z.string(), z.unknown()) }),
    z.object({ type: z.literal('cursor'), x: z.number(), y: z.number() }),
])

const parseMessage = (raw: string): IncomingWhiteboardMessage | null => {
    let json: unknown
    try {
        json = JSON.parse(raw)
    } catch {
        return null
    }
    const result = incomingMessageSchema.safeParse(json)
    return result.success ? (result.data as IncomingWhiteboardMessage) : null
}

// A browser always sends `Origin` on a WebSocket upgrade, and cookies ride along.
// Reject another site's page. A client that sends no `Origin` is not a browser.
const isAllowedOrigin = (origin: string | undefined): boolean => {
    const allowed = process.env.FRONTEND_URL
    if (!origin || !allowed) return true
    return origin === allowed
}

// A handler set that closes the socket on open. The upgrade itself must still succeed,
// so the client can read the close code and reason.
const rejectUpgrade = (reason: string) => ({
    onOpen(_: unknown, ws: { close(code?: number, reason?: string): void }) {
        ws.close(1008, reason)
    },
    onMessage() {},
    onClose() {},
})

export const whiteboardRoutes = new Hono()

whiteboardRoutes.get(
    '/:appointmentId',
    upgradeWebSocket(async (c) => {
        const appointmentId = c.req.param('appointmentId')!

        if (!isAllowedOrigin(c.req.header('origin'))) return rejectUpgrade('Forbidden')

        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session) return rejectUpgrade('Unauthorized')

        const userId = session.user.id
        const userName = session.user.name ?? 'Anonymous'
        const appointment = await AppointmentsService.getForParticipant(appointmentId, userId)

        if (!appointment || appointment.status !== 'active') {
            return rejectUpgrade(appointment ? 'AppointmentNotActive' : 'NotFound')
        }

        let conn: RoomConnection | null = null
        let ready: Promise<Room | null> = Promise.resolve(null)
        // Messages run one after another and only after the room is ready.
        // A message that arrives during the room load waits. It is never dropped.
        let queue: Promise<void> = Promise.resolve()

        return {
            onOpen(_, ws) {
                const rawWs = ws.raw as ServerWebSocket<unknown>
                const connection = WhiteboardRooms.createConnection(rawWs, userName)
                conn = connection

                ready = WhiteboardRooms.join(appointmentId, connection)
                    .then((room) => {
                        if (!room && !connection.closed) rawWs.close(1008, 'AppointmentNotActive')
                        return room
                    })
                    .catch((err) => {
                        log.error('[Whiteboard] Failed to join room', { appointmentId, err })
                        rawWs.close(1011, 'InternalError')
                        return null
                    })
            },

            onMessage(event) {
                const connection = conn
                if (!connection || connection.closed) return
                if (!WhiteboardRooms.allowMessage(connection)) return

                const message = parseMessage(event.data.toString())
                if (!message) return

                // A thrown error must not stop the queue, or the connection would silently ignore all later messages.
                queue = queue
                    .then(async () => {
                        const room = await ready
                        if (room) WhiteboardRooms.handle(room, connection, message)
                    })
                    .catch((err) => {
                        log.error('[Whiteboard] Failed to handle message', { appointmentId, err })
                    })
            },

            onClose() {
                const connection = conn
                if (!connection) return
                connection.closed = true
                void ready.then((room) => {
                    if (room) WhiteboardRooms.leave(room, connection)
                })
            },
        }
    }),
)
