import { afterEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'
import { app } from 'config/app'
import { jsonBody } from '../../test-fixtures/responses'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { insertTestFile } from '../../test-fixtures/files'
import { testDb } from '../../test-fixtures/db'
import { ClientsService } from '../clients/services'
import {
    createAppointment,
    startAppointment,
    endAppointment,
} from '../../test-fixtures/appointments'
import { AttachmentsService } from '../attachments/services'
import { futureDate } from '../../test-fixtures/dates'
import { MAX_UPLOAD_BYTES } from './upload-validation'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]
const WEBM_SIGNATURE = [0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]
const WEBP_SIGNATURE = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]

function fileFrom(name: string, mime: string, head: number[], tail: number[] = []): File {
    return new File([new Uint8Array([...head, ...tail])], name, { type: mime })
}

const uploadedFilesToCleanup: string[] = []

afterEach(async () => {
    while (uploadedFilesToCleanup.length > 0) {
        const storedName = uploadedFilesToCleanup.pop()!
        await rm(`./uploads/${storedName}`, { force: true })
    }
})

async function uploadFileForUser(
    userId: string,
    file: File,
): Promise<{ status: number; body: any }> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await app.request(
        '/api/files/upload',
        await asUser(userId, { method: 'POST', body: formData }),
    )
    const body = res.status === 201 ? await jsonBody(res) : await jsonBody(res).catch(() => null)
    if (body?.url) {
        const storedName = body.url.split('/').pop()
        if (storedName) uploadedFilesToCleanup.push(storedName)
    }
    return { status: res.status, body }
}

describe('POST /api/files/upload', () => {
    it('returns 401 for unauthenticated request', async () => {
        const formData = new FormData()
        formData.append('file', fileFrom('a.png', 'image/png', PNG_SIGNATURE))

        const res = await app.request('/api/files/upload', { method: 'POST', body: formData })
        expect(res.status).toBe(401)
    })

    it('returns 400 BadRequest when file is missing from body', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })

        const formData = new FormData()
        const res = await app.request(
            '/api/files/upload',
            await asUser(user.id, { method: 'POST', body: formData }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'file is required')
    })

    it('returns 201 with metadata, inserts a DB row, and writes the file to disk', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const file = fileFrom('photo.png', 'image/png', PNG_SIGNATURE)

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(201)
        expect(body).toHaveProperty('id')
        expect(body).toHaveProperty('originalName', 'photo.png')
        expect(body).toHaveProperty('mimeType', 'image/png')
        expect(Number(body.size)).toBe(PNG_SIGNATURE.length)
        expect(body).toHaveProperty('uploadedAt')
        expect(body.url).toMatch(/^\/api\/files\/[\w-]+\.png$/)

        const storedName = body.url.split('/').pop()!

        const [row] = await testDb`
            SELECT
                id,
                original_name AS "originalName",
                stored_name AS "storedName",
                mime_type AS "mimeType",
                size,
                uploaded_by AS "uploadedBy"
            FROM files WHERE id = ${body.id}
        `
        expect(row).toBeDefined()
        expect(row.originalName).toBe('photo.png')
        expect(row.storedName).toBe(storedName)
        expect(row.mimeType).toBe('image/png')
        expect(Number(row.size)).toBe(PNG_SIGNATURE.length)
        expect(row.uploadedBy).toBe(user.id)

        const onDisk = Bun.file(`./uploads/${storedName}`)
        expect(await onDisk.exists()).toBe(true)
        const onDiskBytes = new Uint8Array(await onDisk.arrayBuffer())
        expect(onDiskBytes).toEqual(new Uint8Array(PNG_SIGNATURE))
    })

    it('uses the canonical extension for the detected MIME in storedName', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        // Upload JPEG bytes with a misleading .png filename — stored extension
        // should follow the detected content (.jpg), not the original filename.
        const file = new File([new Uint8Array(JPEG_SIGNATURE)], 'lying.png', { type: 'image/png' })

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(201)
        expect(body.mimeType).toBe('image/jpeg')
        expect(body.url).toMatch(/\.jpg$/)
        expect(body.originalName).toBe('lying.png')
    })

    it('produces distinct storedNames across uploads', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const file1 = fileFrom('same.png', 'image/png', PNG_SIGNATURE, [1])
        const file2 = fileFrom('same.png', 'image/png', PNG_SIGNATURE, [2])

        const r1 = await uploadFileForUser(user.id, file1)
        const r2 = await uploadFileForUser(user.id, file2)

        expect(r1.status).toBe(201)
        expect(r2.status).toBe(201)
        expect(r1.body.url).not.toBe(r2.body.url)
    })

    it('accepts valid WebP files', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const file = fileFrom('pic.webp', 'image/webp', WEBP_SIGNATURE)

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(201)
        expect(body.mimeType).toBe('image/webp')
    })

    it('accepts WebM audio regardless of how Bun re-derives the declared Content-Type', async () => {
        // Bun's request.formData() re-derives the part's Content-Type from the
        // filename extension, so a `.webm` file always arrives at the handler
        // as `video/webm`. Detection is byte-based so this is fine.
        const user = await insertTestUser({ activeRole: 'psycho' })
        const file = fileFrom('clip.webm', 'audio/webm', WEBM_SIGNATURE)

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(201)
        expect(body.mimeType).toBe('audio/webm')
        expect(body.url).toMatch(/\.webm$/)

        const [row] = await testDb`
            SELECT mime_type AS "mimeType" FROM files WHERE id = ${body.id}
        `
        expect(row.mimeType).toBe('audio/webm')
    })

    it('returns 400 FileTooLarge when file.size exceeds MAX_UPLOAD_BYTES', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        // Sized just over MAX so the multipart body still fits under the bodyLimit ceiling
        // (MAX + 1024). Triggers the service-level size check.
        const oversize = new Uint8Array(MAX_UPLOAD_BYTES + 100)
        oversize.set(PNG_SIGNATURE, 0)
        const file = new File([oversize], 'huge.png', { type: 'image/png' })

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(400)
        expect(body).toHaveProperty('error', 'FileTooLarge')
    })

    it('returns 400 from the bodyLimit middleware when the request body itself is too large', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        // Sized well over MAX + headroom so bodyLimit rejects before parseBody runs.
        const oversize = new Uint8Array(MAX_UPLOAD_BYTES + 64 * 1024)
        oversize.set(PNG_SIGNATURE, 0)
        const file = new File([oversize], 'huge.png', { type: 'image/png' })

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(400)
        expect(body).toHaveProperty('error', 'FileTooLarge')
    })

    it('returns 400 UnsupportedFileType when content does not match any allowed signature', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        // PDF bytes — sniffMime returns null for these.
        const file = fileFrom('doc.pdf', 'application/pdf', PDF_SIGNATURE)

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(400)
        expect(body).toHaveProperty('error', 'UnsupportedFileType')
    })
})

describe('GET /api/files/:filename', () => {
    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/files/whatever.txt')
        expect(res.status).toBe(401)
    })

    it('returns 200 with the file when requested by the uploader', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const file = fileFrom('note.png', 'image/png', PNG_SIGNATURE)

        const upload = await uploadFileForUser(user.id, file)
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const bytes = new Uint8Array(await res.arrayBuffer())
        expect(bytes).toEqual(new Uint8Array(PNG_SIGNATURE))
    })

    it('returns 200 to the psycho when the file is linked to their appointment attachment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(1),
            endTime: futureDate(1, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const upload = await uploadFileForUser(
            client.id,
            fileFrom('shared.png', 'image/png', PNG_SIGNATURE),
        )
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Impression with a file',
            text: 'with a file',
            imageFileIds: [upload.body.id],
        })

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const bytes = new Uint8Array(await res.arrayBuffer())
        expect(bytes).toEqual(new Uint8Array(PNG_SIGNATURE))
    })

    it('returns 200 to the client when the file is linked to their appointment attachment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(1),
            endTime: futureDate(1, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const upload = await uploadFileForUser(
            psycho.id,
            fileFrom('reco.png', 'image/png', PNG_SIGNATURE),
        )
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Reco',
            text: 'see attached',
            imageFileIds: [upload.body.id],
        })

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(client.id, { headers: { 'Helpsycho-User-Role': 'client' } }),
        )

        expect(res.status).toBe(200)
        const bytes = new Uint8Array(await res.arrayBuffer())
        expect(bytes).toEqual(new Uint8Array(PNG_SIGNATURE))
    })

    it('returns 404 when the storedName does not exist in DB', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })

        const res = await app.request(
            '/api/files/does-not-exist.txt',
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when the requester is unrelated to the file', async () => {
        const owner = await insertTestUser({ email: 'owner@test.com', activeRole: 'psycho' })
        const stranger = await insertTestUser({ email: 'stranger@test.com', activeRole: 'psycho' })

        const upload = await uploadFileForUser(
            owner.id,
            fileFrom('private.png', 'image/png', PNG_SIGNATURE),
        )
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(stranger.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when the DB row exists but the file is missing from disk', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })

        const file = await insertTestFile(user.id, { storedName: 'missing-on-disk.png' })

        const res = await app.request(
            `/api/files/${file.storedName}`,
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'NotFound')
    })
})
