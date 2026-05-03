import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { ProgressService } from './services'

export const clientProgressRoutes = new Hono().use(authorized, onlyClientRequest)

clientProgressRoutes.get('/psychologists', async (c) => {
    const user = c.get('user')
    const psychologists = await ProgressService.listPsychologistsForClient(user.id)
    return c.json({ psychologists }, 200)
})

clientProgressRoutes.get('/:psychoId', async (c) => {
    const user = c.get('user')
    const sessions = await ProgressService.listSessionsForClient(user.id, c.req.param('psychoId'))
    return c.json({ sessions }, 200)
})
