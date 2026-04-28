import { Hono } from 'hono'
import { BadRequestError } from 'errors/index'
import { authorized } from '../../middlewares/auth'
import { FilesService } from './services'

export const fileRoutes = new Hono().use(authorized)

fileRoutes.post('/upload', async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
        throw new BadRequestError('file is required')
    }

    const result = await FilesService.uploadForUser(user.id, file)
    return c.json(result, 201)
})

fileRoutes.get('/:filename', async (c) => {
    const user = c.get('user')
    const filename = c.req.param('filename')

    const bunFile = await FilesService.findAccessibleForUser(user.id, filename)

    return new Response(bunFile, {
        headers: {
            'Content-Type': bunFile.type,
        },
    })
})
