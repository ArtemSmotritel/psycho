import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { jsonBody } from '../../test-fixtures/responses'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { testDb } from '../../test-fixtures/db'
import { ClientsService } from '../clients/services'
import { InvitationsService } from './services'

const createInvitation = (psychoId: string, email: string) =>
    InvitationsService.createForPsycho(psychoId, email)

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
        const body = await jsonBody(res)
        expect(body).toHaveProperty('id')
        expect(body).toHaveProperty('token')
        expect(body).toHaveProperty('invitedEmail', 'newclient@example.com')
        expect(body).toHaveProperty('status', 'pending')
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
        const body = await jsonBody(res)
        expect(body).toHaveProperty('id', existing.id)
        expect(body).toHaveProperty('token', existing.token)
        expect(body).toHaveProperty('inviteLink')
    })

    it('returns 400 with AlreadyLinked when client is already linked', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@test.com' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AlreadyLinked')
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

describe('GET /api/invitations', () => {
    it('returns only pending invitations scoped to the requesting psycho, ordered DESC by created_at', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const otherPsycho = await insertTestUser({ email: 'other-psycho@test.com' })

        const first = await createInvitation(psycho.id, 'first@example.com')
        const second = await createInvitation(psycho.id, 'second@example.com')
        await createInvitation(otherPsycho.id, 'stranger@example.com')

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('invitations')
        expect(body.invitations).toHaveLength(2)

        // DESC by created_at — second created should come first
        const emails = body.invitations.map((i: any) => i.invitedEmail)
        expect(emails).toEqual(['second@example.com', 'first@example.com'])

        // Each row has inviteLink
        for (const inv of body.invitations) {
            expect(inv).toHaveProperty('inviteLink')
            expect(inv.inviteLink).toContain(`/invite?token=${inv.token}`)
        }

        // Ids correspond to the ones created for this psycho
        const ids = body.invitations.map((i: any) => i.id)
        expect(ids).toContain(first.id)
        expect(ids).toContain(second.id)
    })

    it('excludes accepted invitations', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const invitation = await createInvitation(psycho.id, 'to-accept@example.com')
        await testDb`UPDATE invitations SET status = 'accepted' WHERE id = ${invitation.id}`
        await createInvitation(psycho.id, 'still-pending@example.com')

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        const emails = body.invitations.map((i: any) => i.invitedEmail)
        expect(emails).toEqual(['still-pending@example.com'])
    })

    it('returns empty array when no pending invitations exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toEqual({ invitations: [] })
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/invitations')
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/invitations',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('DELETE /api/invitations/:id', () => {
    it('deletes pending invitation and returns 204', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@example.com')

        const res = await app.request(
            `/api/invitations/${invitation.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(204)

        const [remaining] = await testDb`SELECT 1 FROM invitations WHERE id = ${invitation.id}`
        expect(remaining).toBeUndefined()
    })

    it('returns 404 when invitation belongs to another psycho', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const otherPsycho = await insertTestUser({ email: 'other-psycho@test.com' })
        const invitation = await createInvitation(otherPsycho.id, 'client@example.com')

        const res = await app.request(
            `/api/invitations/${invitation.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'NotFound')

        // Other psycho's invitation still exists
        const [stillThere] = await testDb`SELECT 1 FROM invitations WHERE id = ${invitation.id}`
        expect(stillThere).toBeDefined()
    })

    it('returns 404 when invitation id does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/invitations/00000000-0000-0000-0000-000000000000',
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 InvalidStatus when invitation is already accepted', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@test.com')

        // Accept to flip status
        await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        const res = await app.request(
            `/api/invitations/${invitation.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'InvalidStatus')
    })

    it('after delete, accepting the same token returns 404 NotFound', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const invitation = await createInvitation(psycho.id, 'client@test.com')

        // Delete the invitation
        const deleteRes = await app.request(
            `/api/invitations/${invitation.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )
        expect(deleteRes.status).toBe(204)

        // Now try to accept
        const acceptRes = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )
        expect(acceptRes.status).toBe(404)
        const body = await jsonBody(acceptRes)
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/invitations/some-id', { method: 'DELETE' })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/invitations/some-id',
            await asUser(user.id, { method: 'DELETE', headers: CLIENT_HEADER }),
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
        const body = await jsonBody(res)
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
        const listBody = await jsonBody(listRes)
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
        const body = await jsonBody(res)
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
        const body = await jsonBody(res)
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
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AlreadyAccepted')
    })

    it('returns 400 with AlreadyLinked when client is already linked to the psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        // Create invitation first, then link — otherwise createInvitation throws AlreadyLinked
        const invitation = await createInvitation(psycho.id, 'client@test.com')
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
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
        const body = await jsonBody(res)
        expect(body).toHaveProperty('psychologistId', psycho.id)
        expect(body).toHaveProperty('clientId', client.id)
    })
})
