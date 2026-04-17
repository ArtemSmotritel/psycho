import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { authorized, onlyPsychoRequest } from '../../middlewares/auth'
import { db } from 'config/db'
import { listByPsychologist, create, updateName, deleteImage } from './services'

const createSchema = z.object({
    name: z.string().min(1),
    fileId: z.string().min(1),
})

const updateSchema = z.object({
    name: z.string().min(1),
})

export const associativeImageRoutes = new Hono()

associativeImageRoutes.use(authorized, onlyPsychoRequest)

associativeImageRoutes.get('/', async (c) => {
    const user = c.get('user')
    const images = await listByPsychologist(user.id)
    return c.json({ images }, 200)
})

associativeImageRoutes.post('/', zValidator('json', createSchema), async (c) => {
    const user = c.get('user')
    const { name, fileId } = c.req.valid('json')

    const [file] = await db`SELECT 1 FROM files WHERE id = ${fileId} AND uploaded_by = ${user.id}`
    if (!file) {
        return c.json(
            { error: 'FileNotOwned', message: 'File not found or not owned by you.' },
            403,
        )
    }

    const image = await create({ psychologistId: user.id, name, fileId })
    return c.json({ image }, 201)
})

associativeImageRoutes.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { name } = c.req.valid('json')

    const image = await updateName(id, user.id, name)
    if (!image) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ image }, 200)
})

associativeImageRoutes.delete('/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    const deleted = await deleteImage(id, user.id)
    if (!deleted) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return c.json({ success: true }, 200)
})
