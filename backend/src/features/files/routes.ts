import { Hono } from 'hono'
import { authorized } from '../../middlewares/auth'
import { BadRequestError } from 'errors/index'
import { findAccessibleFile, uploadFile } from './services'

export const fileRoutes = new Hono()

fileRoutes.post('/upload', authorized, async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
        throw new BadRequestError('file is required')
    }

    const result = await uploadFile(user.id, file)
    return c.json(result, 201)
})

fileRoutes.get('/:filename', authorized, async (c) => {
    const user = c.get('user')
    const filename = c.req.param('filename')

    const bunFile = await findAccessibleFile(user.id, filename)

    return new Response(bunFile, {
        headers: {
            'Content-Type': bunFile.type,
        },
    })
})
