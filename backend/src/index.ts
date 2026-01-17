import { app } from 'config/app'

Bun.serve({
    fetch: app.fetch,
    port: 3000,
})

console.log(`🚀 Hono is running on http://localhost:3000`)
