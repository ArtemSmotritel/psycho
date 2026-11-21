import { app } from 'config/app'
import { websocket } from 'config/websocket'
import { registerNotificationCrons } from './features/notifications/cron'
import { WhiteboardRooms } from './features/whiteboard/rooms'

Bun.serve({
    fetch: app.fetch,
    websocket,
    port: 3000,
})

registerNotificationCrons()
WhiteboardRooms.registerShutdownFlush()

console.log(`🚀 Hono is running on http://localhost:3000`)
