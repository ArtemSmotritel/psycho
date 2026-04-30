import { Hono } from 'hono'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'

export const attachmentPsychoRoutes = new Hono()

attachmentPsychoRoutes.use(authorized, onlyPsychoRequest)

attachmentPsychoRoutes.get('/:attachmentId', async (c) => {
    return c.json({ attachment: null }, 200)
})
