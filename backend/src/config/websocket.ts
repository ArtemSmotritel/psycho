import { createBunWebSocket } from 'hono/bun'
import { BACKPRESSURE_LIMIT_BYTES, MAX_MESSAGE_BYTES } from '../features/whiteboard/limits'

const bunWebSocket = createBunWebSocket()

export const upgradeWebSocket = bunWebSocket.upgradeWebSocket

export const websocket = {
    ...bunWebSocket.websocket,
    maxPayloadLength: MAX_MESSAGE_BYTES,
    // A client that cannot keep up gets disconnected. It reconnects and syncs,
    // so it never stays out of sync without noticing.
    backpressureLimit: BACKPRESSURE_LIMIT_BYTES,
    closeOnBackpressureLimit: true,
}
