import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { BadRequestError } from 'errors/index'
import { authorized } from '../../middlewares/auth'
import { FilesService } from './services'
import { BODY_LIMIT_HEADROOM, MAX_UPLOAD_BYTES } from './upload-validation'

export const fileRoutes = new Hono().use(authorized)

fileRoutes.post(
    '/upload',
    bodyLimit({
        maxSize: MAX_UPLOAD_BYTES + BODY_LIMIT_HEADROOM,
        onError: () => {
            throw new BadRequestError('File is too large.', 'FileTooLarge')
        },
    }),
    async (c) => {
        const user = c.get('user')
        const body = await c.req.parseBody()
        const file = body['file']

        if (!file || !(file instanceof File)) {
            throw new BadRequestError('file is required')
        }

        const result = await FilesService.uploadForUser(user.id, file)
        return c.json(result, 201)
    },
)

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
