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
    const user = c.get('user')
    const filename = c.req.param('filename')

    // Verify the user has access: they uploaded it, or it's attached to their appointment
    const [allowed] = await db`
        SELECT 1 FROM files f
        WHERE f.stored_name = ${filename}
          AND (
            f.uploaded_by = ${user.id}
            OR EXISTS (
              SELECT 1
              FROM attachment_files af
              JOIN attachments a ON a.id = af.attachment_id
              JOIN appointments ap ON ap.id = a.appointment_id
              WHERE af.file_id = f.id
                AND (ap.psycho_id = ${user.id} OR ap.client_id = ${user.id})
            )
          )
    `

    if (!allowed) {
        return c.json({ error: 'NotFound' }, 404)
    }

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
