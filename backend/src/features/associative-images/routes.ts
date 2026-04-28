import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { AssociativeImagesService } from './services'

const createSchema = z.object({
    name: z.string().min(1),
    fileId: z.string().min(1),
})

const updateSchema = z.object({
    name: z.string().min(1),
})

export const associativeImageRoutes = new Hono().use(authorized, onlyPsychoRequest)

associativeImageRoutes.get('/', async (c) => {
    const user = c.get('user')
    const search = c.req.query('search') ?? ''
    const limit = Math.min(Number(c.req.query('limit')) || 20, 50)
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0)
    const result = await AssociativeImagesService.listForPsycho(user.id, {
        search,
        limit,
        offset,
    })
    return c.json(result, 200)
})

associativeImageRoutes.post('/', zValidator('json', createSchema), async (c) => {
    const user = c.get('user')
    const { name, fileId } = c.req.valid('json')
    const image = await AssociativeImagesService.createForPsycho({
        psychoId: user.id,
        name,
        fileId,
    })
    return c.json({ image }, 201)
})

associativeImageRoutes.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { name } = c.req.valid('json')
    const image = await AssociativeImagesService.renameForPsycho(id, user.id, name)
    return c.json({ image }, 200)
})

associativeImageRoutes.delete('/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    await AssociativeImagesService.deleteForPsycho(id, user.id)
    return c.body(null, 204)
})
