import { afterEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { insertTestFile } from '../../test-fixtures/files'
import { testDb } from '../../test-fixtures/db'
import { ClientsService } from '../clients/services'
import { createAppointment, startAppointment, endAppointment } from '../appointments/services'
import { createAttachment } from '../attachments/services'
import { futureDate } from '../../test-fixtures/dates'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }

// Track files written to disk by tests so we can clean them up.
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
    const body = res.status === 201 ? await res.json() : await res.json().catch(() => null)
    if (body?.url) {
        // Track storedName (last URL segment) for cleanup.
        const storedName = body.url.split('/').pop()
        if (storedName) uploadedFilesToCleanup.push(storedName)
    }
    return { status: res.status, body }
}

describe('POST /api/files/upload', () => {
    it('returns 401 for unauthenticated request', async () => {
        const formData = new FormData()
        formData.append('file', new File(['data'], 'a.txt', { type: 'text/plain' }))

        const res = await app.request('/api/files/upload', { method: 'POST', body: formData })
        expect(res.status).toBe(401)
    })

    it('returns 400 BadRequest when file is missing from body', async () => {
        const user = await insertTestUser()

        const formData = new FormData()
        const res = await app.request(
            '/api/files/upload',
            await asUser(user.id, { method: 'POST', body: formData }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'file is required')
    })

    it('returns 201 with metadata, inserts a DB row, and writes the file to disk', async () => {
        const user = await insertTestUser()
        const fileBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
        const file = new File([fileBytes], 'photo.png', { type: 'image/png' })

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(201)
        expect(body).toHaveProperty('id')
        expect(body).toHaveProperty('originalName', 'photo.png')
        expect(body).toHaveProperty('mimeType', 'image/png')
        // size is BIGINT — Bun's SQL driver returns it as a string.
        expect(Number(body.size)).toBe(fileBytes.byteLength)
        expect(body).toHaveProperty('uploadedAt')
        expect(body.url).toMatch(/^\/api\/files\/[\w-]+\.png$/)

        const storedName = body.url.split('/').pop()!

        // Row inserted with the right fields.
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
        expect(Number(row.size)).toBe(fileBytes.byteLength)
        expect(row.uploadedBy).toBe(user.id)

        // File actually written to disk with the correct bytes.
        const onDisk = Bun.file(`./uploads/${storedName}`)
        expect(await onDisk.exists()).toBe(true)
        const onDiskBytes = new Uint8Array(await onDisk.arrayBuffer())
        expect(onDiskBytes).toEqual(fileBytes)
    })

    it('preserves the original file extension in storedName', async () => {
        const user = await insertTestUser()
        const file = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' })

        const { status, body } = await uploadFileForUser(user.id, file)

        expect(status).toBe(201)
        expect(body.url).toMatch(/\.png$/)
    })

    it('produces distinct storedNames across uploads', async () => {
        const user = await insertTestUser()
        const file1 = new File(['a'], 'same.txt', { type: 'text/plain' })
        const file2 = new File(['b'], 'same.txt', { type: 'text/plain' })

        const r1 = await uploadFileForUser(user.id, file1)
        const r2 = await uploadFileForUser(user.id, file2)

        expect(r1.status).toBe(201)
        expect(r2.status).toBe(201)
        expect(r1.body.url).not.toBe(r2.body.url)
    })
})

describe('GET /api/files/:filename', () => {
    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/files/whatever.txt')
        expect(res.status).toBe(401)
    })

    it('returns 200 with the file when requested by the uploader', async () => {
        const user = await insertTestUser()
        const file = new File(['my-bytes'], 'note.txt', { type: 'text/plain' })

        const upload = await uploadFileForUser(user.id, file)
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toBe('text/plain;charset=utf-8')
        expect(await res.text()).toBe('my-bytes')
    })

    it('returns 200 to the psycho when the file is linked to their appointment attachment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(1),
            endTime: futureDate(1, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        // File uploaded by client; psycho has access via the attachment.
        const upload = await uploadFileForUser(client.id, new File(['shared'], 'shared.txt'))
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        await createAttachment({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'with a file',
            imageFileIds: [upload.body.id],
        })

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        expect(await res.text()).toBe('shared')
    })

    it('returns 200 to the client when the file is linked to their appointment attachment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(1),
            endTime: futureDate(1, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        // File uploaded by psycho; client has access via the attachment.
        const upload = await uploadFileForUser(psycho.id, new File(['psycho-bytes'], 'p.txt'))
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        await createAttachment({
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
        expect(await res.text()).toBe('psycho-bytes')
    })

    it('returns 404 when the storedName does not exist in DB', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/files/does-not-exist.txt',
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when the requester is unrelated to the file', async () => {
        const owner = await insertTestUser({ email: 'owner@test.com' })
        const stranger = await insertTestUser({ email: 'stranger@test.com' })

        const upload = await uploadFileForUser(owner.id, new File(['private'], 'private.txt'))
        expect(upload.status).toBe(201)
        const storedName = upload.body.url.split('/').pop()!

        const res = await app.request(
            `/api/files/${storedName}`,
            await asUser(stranger.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when the DB row exists but the file is missing from disk', async () => {
        const user = await insertTestUser()

        // insertTestFile inserts a DB row only; nothing on disk.
        const file = await insertTestFile(user.id, { storedName: 'missing-on-disk.png' })

        const res = await app.request(
            `/api/files/${file.storedName}`,
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })
})
