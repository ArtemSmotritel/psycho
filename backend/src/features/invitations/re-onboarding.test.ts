import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { jsonBody } from '../../test-fixtures/responses'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { testDb } from '../../test-fixtures/db'
import { ClientsService } from '../clients/services'
import { InvitationsService } from './services'

const createInvitation = (psychoId: string, email: string) =>
    InvitationsService.createForPsycho(psychoId, email)
import { createAppointment } from '../../test-fixtures/appointments'
import { futureDate } from '../../test-fixtures/dates'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── Re-onboarding flow ────────────────────────────────────────────────────

describe('Client re-onboarding after disconnect', () => {
    it('psychologist can create invitation for a disconnected client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/invitations',
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ email: 'client@test.com' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('status', 'pending')
    })

    it('disconnected client can accept a new invitation and re-link', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

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

        // Verify disconnected_at was cleared (not a new row)
        const rows =
            await testDb`SELECT * FROM psychologist_clients WHERE client_id = ${client.id} AND psycho_id = ${psycho.id}`
        expect(rows).toHaveLength(1)
        expect(rows[0].disconnected_at).toBeNull()
    })

    it('re-linked client appears in psychologist client list', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        const invitation = await createInvitation(psycho.id, 'client@test.com')
        await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        const listRes = await app.request(
            '/api/clients',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(listRes.status).toBe(200)
        const listBody = await jsonBody(listRes)
        const emails = listBody.clients.map((c: any) => c.email)
        expect(emails).toContain('client@test.com')
    })

    it('old appointments become visible again after re-linking', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        // Create an appointment before disconnecting
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        // Verify appointment is hidden while disconnected
        const hiddenRes = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )
        expect(hiddenRes.status).toBe(400) // ClientNotLinked

        // Re-link
        const invitation = await createInvitation(psycho.id, 'client@test.com')
        await app.request(
            '/api/invitations/accept',
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: invitation.token }),
            }),
        )

        // Verify appointment is visible again
        const visibleRes = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )
        expect(visibleRes.status).toBe(200)
        const body = await jsonBody(visibleRes)
        expect(body.appointments).toHaveLength(1)
        expect(body.appointments[0].id).toBe(apt.id)
    })
})

// ─── Disconnected client data visibility ────────────────────────────────────

describe('Disconnected client data is hidden from psychologist', () => {
    it('disconnected client does not appear in GET /api/clients', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/clients',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.clients).toHaveLength(0)
    })

    it('psychologist cannot access disconnected client profile via GET /api/clients/:clientId', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
    })

    it('psychologist cannot list appointments for a disconnected client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'ClientNotLinked')
    })

    it('disconnected client appointments do not appear in GET /api/psycho/appointments/all', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })
        await ClientsService.linkClientToPsycho(client1.id, psycho.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho.id)

        await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await createAppointment({
            psychoId: psycho.id,
            clientId: client2.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
        })

        // Disconnect client1
        await ClientsService.unlinkClientFromPsycho(client1.id, psycho.id)

        const res = await app.request(
            '/api/psycho/appointments/all',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.appointments).toHaveLength(1)
        expect(body.appointments[0].clientId).toBe(client2.id)
    })

    it('psychologist cannot update a disconnected client profile', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        await ClientsService.unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}`,
            await asUser(psycho.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Hacked Name' }),
            }),
        )

        expect(res.status).toBe(404)
    })
})
