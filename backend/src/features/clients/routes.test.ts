import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { linkClientToPsycho, unlinkClientFromPsycho } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

describe('POST /api/clients', () => {
    it('returns 400 when email is missing from body', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/clients',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 with ClientNotFound when no account exists for given email', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/clients',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'notfound@example.com' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'ClientNotFound')
        expect(body).toHaveProperty(
            'message',
            'No account found for this email. Ask your client to register first.',
        )
    })

    it('returns 400 with AlreadyLinked when client is already in the psychologist list', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/clients',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@test.com' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AlreadyLinked')
        expect(body).toHaveProperty('message', 'This client is already in your list.')
    })

    it('returns 201 with client on success', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/clients',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@test.com' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('client')
        expect(body.client).toHaveProperty('id', client.id)
        expect(body.client).toHaveProperty('email', 'client@test.com')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client@example.com' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ email: 'client@example.com' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients', () => {
    it('returns list of clients for authenticated psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'a@test.com', name: 'Alice' })
        const client2 = await insertTestUser({ email: 'b@test.com', name: 'Bob' })
        await linkClientToPsycho(client1.id, psycho.id)
        await linkClientToPsycho(client2.id, psycho.id)

        const res = await app.request(
            '/api/clients',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('clients')
        expect(body.clients).toHaveLength(2)
        const emails = body.clients.map((c: any) => c.email)
        expect(emails).toContain('a@test.com')
        expect(emails).toContain('b@test.com')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients')
        expect(res.status).toBe(401)
    })
})

describe('GET /api/clients (non-psycho role returns 403)', () => {
    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients/:clientId', () => {
    it('returns 200 with client object for known clientId', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com', name: 'Jane Doe' })

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('client')
        expect(body.client).toHaveProperty('id', client.id)
        expect(body.client).toHaveProperty('email', 'client@test.com')
        expect(body.client).toHaveProperty('name', 'Jane Doe')
    })

    it('returns 404 for unknown clientId', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/clients/nonexistent-id',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-id',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('DELETE /api/clients/:clientId', () => {
    it('returns 200 with { success: true } on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('success', true)
    })

    it('returns 404 when relationship does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when relationship is already disconnected', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        await unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 for non-psycho role', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-id',
            await asUser(user.id, { method: 'DELETE', headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-id', { method: 'DELETE' })
        expect(res.status).toBe(401)
    })
})
