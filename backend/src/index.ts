import { app } from 'config/app'
import { websocket } from 'config/websocket'

Bun.serve({
    fetch: app.fetch,
    websocket,
    port: 3000,
})

console.log(`🚀 Hono is running on http://localhost:3000`)
