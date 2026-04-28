import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { insertTestFile } from '../../test-fixtures/files'
import { testDb } from '../../test-fixtures/db'
import { AssociativeImagesService } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── helpers ────────────────────────────────────────────────────────────────

async function createImage(psychoId: string, name: string = 'Test Image') {
    const file = await insertTestFile(psychoId)
    return AssociativeImagesService.createForPsycho({
        psychoId,
        name,
        fileId: file.id,
    })
}

// ─── GET / ──────────────────────────────────────────────────────────────────

describe('GET /api/associative-images', () => {
    it('returns { images: [] } when psychologist has no images', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('images')
        expect(body.images).toHaveLength(0)
    })

    it('returns only images belonging to the requesting psychologist', async () => {
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        await createImage(psycho1.id, 'Psycho1 Image')
        await createImage(psycho2.id, 'Psycho2 Image')

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho1.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.images).toHaveLength(1)
        expect(body.images[0]).toHaveProperty('name', 'Psycho1 Image')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/associative-images')
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/associative-images',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

// ─── POST / ─────────────────────────────────────────────────────────────────

describe('POST /api/associative-images', () => {
    it('returns 201 with created image on success', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const file = await insertTestFile(psycho.id)

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'My Card', fileId: file.id }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('image')
        expect(body.image).toHaveProperty('id')
        expect(body.image).toHaveProperty('name', 'My Card')
        expect(body.image).toHaveProperty('imageUrl')
        expect(body.image.imageUrl).toContain('/api/files/')
    })

    it('returns 400 when name is missing', async () => {
        const psycho = await insertTestUser()
        const file = await insertTestFile(psycho.id)

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ fileId: file.id }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 when fileId is missing', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Test' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 403 when fileId belongs to another user', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const other = await insertTestUser({ email: 'other@test.com' })
        const file = await insertTestFile(other.id)

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Test', fileId: file.id }),
            }),
        )

        expect(res.status).toBe(403)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'FileNotOwned')
    })

    it('returns 403 when fileId does not exist', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Test', fileId: 'nonexistent-id' }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/associative-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test', fileId: 'abc' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/associative-images',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ name: 'Test', fileId: 'abc' }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('created image appears in subsequent GET list', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const file = await insertTestFile(psycho.id)

        await app.request(
            '/api/associative-images',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'New Card', fileId: file.id }),
            }),
        )

        const listRes = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        const body = await listRes.json()
        expect(body.images).toHaveLength(1)
        expect(body.images[0]).toHaveProperty('name', 'New Card')
    })
})

// ─── PATCH /:id ─────────────────────────────────────────────────────────────

describe('PATCH /api/associative-images/:id', () => {
    it('returns 200 with updated image when renaming succeeds', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const image = await createImage(psycho.id, 'Old Name')

        const res = await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'New Name' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.image).toHaveProperty('name', 'New Name')
    })

    it('returns 404 when image does not exist', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/associative-images/nonexistent',
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'New Name' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when image belongs to a different psychologist', async () => {
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const image = await createImage(psycho1.id)

        const res = await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho2.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Hijacked' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 400 when name is missing', async () => {
        const psycho = await insertTestUser()
        const image = await createImage(psycho.id)

        const res = await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/associative-images/some-id', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test' }),
        })
        expect(res.status).toBe(401)
    })
})

// ─── DELETE /:id ────────────────────────────────────────────────────────────

describe('DELETE /api/associative-images/:id', () => {
    it('returns 204 on successful deletion', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const image = await createImage(psycho.id)

        const res = await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: PSYCHO_HEADER,
            }),
        )

        expect(res.status).toBe(204)
    })

    it('deleted image no longer appears in GET list', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const image = await createImage(psycho.id)

        await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: PSYCHO_HEADER,
            }),
        )

        const listRes = await app.request(
            '/api/associative-images',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        const body = await listRes.json()
        expect(body.images).toHaveLength(0)
    })

    it('associated file row is also deleted from files table', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const image = await createImage(psycho.id)

        await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: PSYCHO_HEADER,
            }),
        )

        const [file] = await testDb`SELECT 1 FROM files WHERE id = ${image.fileId}`
        expect(file).toBeUndefined()
    })

    it('returns 404 when image does not exist', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/associative-images/nonexistent',
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: PSYCHO_HEADER,
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when image belongs to a different psychologist', async () => {
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const image = await createImage(psycho1.id)

        const res = await app.request(
            `/api/associative-images/${image.id}`,
            await asUser(psycho2.id, {
                method: 'DELETE',
                headers: PSYCHO_HEADER,
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/associative-images/some-id', {
            method: 'DELETE',
        })
        expect(res.status).toBe(401)
    })
})
