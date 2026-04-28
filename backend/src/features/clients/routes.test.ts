import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { ClientsService } from './services'
import {
    createAppointment,
    startAppointment,
    endAppointment,
} from '../../test-fixtures/appointments'
import { createAttachment } from '../attachments/services'

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
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

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
        await ClientsService.linkClientToPsycho(client1.id, psycho.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho.id)

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
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

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
        expect(body.client).toHaveProperty('username') // null when not set
        expect(body.client).toHaveProperty('phone') // null when not set
        expect(body.client).toHaveProperty('telegram') // null when not set
        expect(body.client).toHaveProperty('instagram') // null when not set
        expect(body.client).toHaveProperty('registrationDate') // ISO string
        expect(body.client).toHaveProperty('sessionsCount', 0)
        expect(body.client).toHaveProperty('impressionsCount', 0)
        expect(body.client).toHaveProperty('recommendationsCount', 0)
        expect(body.client.lastAppointment).toBeNull()
        expect(body.client.nextAppointment).toBeNull()
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

    it('returns correct sessionsCount when appointments exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const a1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        })
        const a2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        })
        await startAppointment(a1.id)
        await endAppointment(a1.id)
        await startAppointment(a2.id)
        await endAppointment(a2.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client).toHaveProperty('sessionsCount', 2)
    })

    it('returns correct lastAppointment (most recent past appointment)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const a1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        })
        const a2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        })
        await startAppointment(a1.id)
        await endAppointment(a1.id)
        await startAppointment(a2.id)
        await endAppointment(a2.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client.lastAppointment).not.toBeNull()
        expect(body.client.lastAppointment.id).toBe(a2.id)
    })

    it('returns correct nextAppointment (earliest upcoming appointment)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const a1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        })
        const _a2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        })

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client.nextAppointment).not.toBeNull()
        expect(body.client.nextAppointment.id).toBe(a1.id)
    })

    it('returns lastAppointment null and nextAppointment null when no appointments exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client.lastAppointment).toBeNull()
        expect(body.client.nextAppointment).toBeNull()
    })

    it('returns correct impressionsCount', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const appt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        })
        await startAppointment(appt.id)
        await endAppointment(appt.id)

        await createAttachment({ appointmentId: appt.id, authorId: psycho.id, type: 'impression' })
        await createAttachment({ appointmentId: appt.id, authorId: psycho.id, type: 'impression' })
        await createAttachment({ appointmentId: appt.id, authorId: psycho.id, type: 'impression' })

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client).toHaveProperty('impressionsCount', 3)
    })

    it('returns correct recommendationsCount', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const appt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        })
        await startAppointment(appt.id)
        await endAppointment(appt.id)

        await createAttachment({
            appointmentId: appt.id,
            authorId: psycho.id,
            type: 'recommendation',
        })
        await createAttachment({
            appointmentId: appt.id,
            authorId: psycho.id,
            type: 'recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client).toHaveProperty('recommendationsCount', 2)
    })
})

describe('DELETE /api/clients/:clientId', () => {
    it('returns 204 on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(204)
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
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

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

describe('PUT /api/clients/:clientId', () => {
    it('returns 200 and updates username, phone, telegram, instagram', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    username: 'new_user',
                    phone: '+1234',
                    telegram: '@t',
                    instagram: '@i',
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('client')
        expect(body.client.username).toBe('new_user')
        expect(body.client.phone).toBe('+1234')
        expect(body.client.telegram).toBe('@t')
        expect(body.client.instagram).toBe('@i')
    })

    it('updates name (in user table)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com', name: 'Old Name' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'New Name' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client.name).toBe('New Name')
    })

    it('does not update email even if sent in body', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'hacker@evil.com' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client.email).toBe('client@test.com')
    })

    it('returns full enriched client object after update', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ username: 'test_user' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client).toHaveProperty('registrationDate')
        expect(body.client).toHaveProperty('sessionsCount')
        expect(body.client).toHaveProperty('impressionsCount')
        expect(body.client).toHaveProperty('recommendationsCount')
        expect(body.client).toHaveProperty('lastAppointment')
        expect(body.client).toHaveProperty('nextAppointment')
    })

    it('returns 404 for unknown clientId', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/clients/nonexistent-id',
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ username: 'test' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-id', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-id',
            await asUser(user.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ username: 'test' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients/me', () => {
    it('returns 200 with own profile when called with client role', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/clients/me',
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client).toMatchObject({
            id: client.id,
            email: 'client@test.com',
        })
    })

    it('returns 403 when called with psycho role', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/clients/me',
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })
})

describe('PUT /api/clients/me', () => {
    it('returns 200 with updated client when called with client role', async () => {
        const client = await insertTestUser()

        const res = await app.request(
            '/api/clients/me',
            await asUser(client.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ phone: '+1234567890', telegram: '@testuser' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.client).toMatchObject({
            id: client.id,
            phone: '+1234567890',
            telegram: '@testuser',
        })
    })

    it('returns 403 when called with psycho role', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/clients/me',
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ phone: '+1234567890' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})
