import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'

export const attachmentClientRoutes = new Hono()

attachmentClientRoutes.use(authorized, onlyClientRequest)

attachmentClientRoutes.get('/:attachmentId', async (c) => {
    return c.json({ attachment: null }, 200)
})
