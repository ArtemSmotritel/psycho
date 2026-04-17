import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { testDb } from '../../test-fixtures/db'
import { linkClientToPsycho } from '../clients/services'
import { createInvitation } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

describe('POST /api/invitations', () => {
    it('returns 201 with invitation object on success', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'newclient@example.com' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('id')
        expect(body).toHaveProperty('token')
        expect(body).toHaveProperty('invitedEmail', 'newclient@example.com')
        expect(body).toHaveProperty('status', 'pending')
        expect(body).toHaveProperty('expiresAt')
        expect(body).toHaveProperty('inviteLink')
        expect(body.inviteLink).toContain(`/invite?token=${body.token}`)
    })

    it('returns 400 when email is missing', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 when email is invalid format', async () => {
        const psycho = await insertTestUser()

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'not-an-email' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 201 with existing invitation when a pending invitation already exists', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const existing = await createInvitation(psycho.id, 'client@example.com')

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@example.com' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('id', existing.id)
        expect(body).toHaveProperty('token', existing.token)
        expect(body).toHaveProperty('inviteLink')
    })

    it('returns 400 with AlreadyLinked when client is already linked', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@test.com' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AlreadyLinked')
    })

    it('allows creating invitation when previous invitation is expired', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        // Insert an expired invitation directly
        await testDb`
            INSERT INTO invitations (psychologist_id, invited_email, status, expires_at)
            VALUES (${psycho.id}, ${'client@example.com'}, ${'pending'}, ${new Date(Date.now() - 86400000).toISOString()})
        `

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@example.com' }),
            }),
        )

        expect(res.status).toBe(201)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client@example.com' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/invitations',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ email: 'client@example.com' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

describe('POST /api/invitations/accept', () => {
    it('returns 200 and creates psychologist_clients link on valid token', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@test.com')

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('psychologistId', psycho.id)
        expect(body).toHaveProperty('clientId', client.id)

        // Verify the link was actually created
        const [link] = await testDb`
            SELECT 1 FROM psychologist_clients
            WHERE client_id = ${client.id} AND psycho_id = ${psycho.id}
        `
        expect(link).toBeDefined()
    })

    it('after accept, client appears in GET /api/clients for that psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@test.com')

        // Accept the invitation
        await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        // Verify client appears in psycho's client list
        const listRes = await app.request(
            '/api/clients',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(listRes.status).toBe(200)
        const listBody = await listRes.json()
        const emails = listBody.clients.map((c: any) => c.email)
        expect(emails).toContain('client@test.com')
    })

    it('returns 400 when token is missing', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 404 when token does not exist', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: 'nonexistent-token' }),
            }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 with EmailMismatch when user email differs from invited_email', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const wrongUser = await insertTestUser({ email: 'wrong@test.com' })
        const invitation = await createInvitation(psycho.id, 'correct@test.com')

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(wrongUser.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'EmailMismatch')
    })

    it('returns 400 when invitation is already accepted', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@test.com')

        // Accept first time
        await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        // Try to accept again
        const res = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AlreadyAccepted')
    })

    it('returns 404 when invitation is expired', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })

        // Insert an expired invitation directly
        const [invitation] = await testDb`
            INSERT INTO invitations (psychologist_id, invited_email, expires_at)
            VALUES (${psycho.id}, ${'client@test.com'}, ${new Date(Date.now() - 86400000).toISOString()})
            RETURNING token
        `

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'Expired')
    })

    it('returns 400 with AlreadyLinked when client is already linked to the psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        // Create invitation first, then link — otherwise createInvitation throws AlreadyLinked
        const invitation = await createInvitation(psycho.id, 'client@test.com')
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AlreadyLinked')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/invitations/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'some-token' }),
        })
        expect(res.status).toBe(401)
    })

    it('works without role header (roleless user after first signup)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@test.com')

        // No role header — simulates a fresh user who just signed up
        const res = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('psychologistId', psycho.id)
        expect(body).toHaveProperty('clientId', client.id)
    })
})
