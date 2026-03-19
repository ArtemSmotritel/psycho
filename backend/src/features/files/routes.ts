import { Hono } from 'hono'
import { authorized } from '../../middlewares/auth'
import { db } from 'config/db'
import { randomUUID } from 'crypto'
import { extname } from 'path'

export const fileRoutes = new Hono()

fileRoutes.post('/upload', authorized, async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
        return c.json({ error: 'BadRequest', message: 'file is required' }, 400)
    }

    const ext = extname(file.name) || ''
    const storedName = `${randomUUID()}${ext}`
    const filePath = `./uploads/${storedName}`

    await Bun.write(filePath, await file.arrayBuffer())

    const [row] = await db`
        INSERT INTO files (original_name, stored_name, mime_type, size, uploaded_by)
        VALUES (${file.name}, ${storedName}, ${file.type}, ${file.size}, ${user.id})
        RETURNING
            id,
            original_name AS "originalName",
            stored_name AS "storedName",
            mime_type AS "mimeType",
            size,
            uploaded_by AS "uploadedBy",
            created_at AS "createdAt"
    `

    return c.json(
        {
            id: row.id,
            url: `/api/files/${storedName}`,
            originalName: row.originalName,
            mimeType: row.mimeType,
            size: row.size,
            uploadedAt: row.createdAt,
        },
        201,
    )
})

fileRoutes.get('/:filename', authorized, async (c) => {
    const filename = c.req.param('filename')
    const filePath = `./uploads/${filename}`

    const bunFile = Bun.file(filePath)
    const exists = await bunFile.exists()

    if (!exists) {
        return c.json({ error: 'NotFound' }, 404)
    }

    return new Response(bunFile, {
        headers: {
            'Content-Type': bunFile.type,
        },
    })
})
