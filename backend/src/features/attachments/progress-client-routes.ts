import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { findPsychologistsForClient, isClientLinkedToPsycho } from '../clients/services'
import { listClientProgressByPsycho } from './services'

export const progressClientRoutes = new Hono()

progressClientRoutes.use(authorized, onlyClientRequest)

progressClientRoutes.get('/psychologists', async (c) => {
    const user = c.get('user')
    const psychologists = await findPsychologistsForClient(user.id)
    return c.json({ psychologists }, 200)
})

progressClientRoutes.get('/:psychoId', async (c) => {
    const user = c.get('user')
    const psychoId = c.req.param('psychoId')

    const linked = await isClientLinkedToPsycho(user.id, psychoId)
    if (!linked) {
        return c.json(
            { error: 'PsychoNotLinked', message: 'This psychologist is not in your list.' },
            400,
        )
    }

    const sessions = await listClientProgressByPsycho(user.id, psychoId)
    return c.json({ sessions }, 200)
})
