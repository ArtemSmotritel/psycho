import { Hono } from 'hono'
import { BadRequestError } from 'errors/index'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { ClientsRepo } from '../clients/repo'
import { listClientProgressByPsycho } from './services'

export const progressClientRoutes = new Hono().use(authorized, onlyClientRequest)

progressClientRoutes.get('/psychologists', async (c) => {
    const user = c.get('user')
    const psychologists = await ClientsRepo.listPsychologistsForClient(user.id)
    return c.json({ psychologists }, 200)
})

progressClientRoutes.get('/:psychoId', async (c) => {
    const user = c.get('user')
    const psychoId = c.req.param('psychoId')

    const linked = await ClientsRepo.isLinkedToPsycho(user.id, psychoId)
    if (!linked) {
        throw new BadRequestError('This psychologist is not in your list.', 'PsychoNotLinked')
    }

    const sessions = await listClientProgressByPsycho(user.id, psychoId)
    return c.json({ sessions }, 200)
})
