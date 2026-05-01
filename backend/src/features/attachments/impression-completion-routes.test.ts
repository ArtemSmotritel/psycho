import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { futureDate, pastDate } from '../../test-fixtures/dates'
import { ClientsService } from '../clients/services'
import {
    createAppointment,
    startAppointment,
    endAppointment,
} from '../../test-fixtures/appointments'
import { createAttachment } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── helpers ───────────────────��─────────────────��──────────────────────────

async function setupImpressionScenario() {
    const psycho = await insertTestUser({ email: 'psycho@test.com' })
    const client = await insertTestUser({ email: 'client@test.com' })
    await ClientsService.linkClientToPsycho(client.id, psycho.id)
    const apt = await createAppointment({
        psychoId: psycho.id,
        clientId: client.id,
        startTime: futureDate(7),
        endTime: futureDate(7, 11),
    })
    await startAppointment(apt.id)
    await endAppointment(apt.id)
    const impression = await createAttachment({
        appointmentId: apt.id,
        authorId: client.id,
        type: 'impression',
        text: 'My impression text',
    })
    return { psycho, client, apt, impression }
}

// ─── PATCH /api/client/appointments/:appointmentId/impressions/:attachmentId/complete ──

describe('PATCH /api/client/appointments/:appointmentId/impressions/:attachmentId/complete', () => {
    it('returns 200 with completion on success', async () => {
        const { client, apt, impression } = await setupImpressionScenario()

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'My completion response' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('completion')
        expect(body.completion).toHaveProperty('attachmentId', impression.id)
        expect(body.completion).toHaveProperty('clientResponse', 'My completion response')
        expect(body.completion).toHaveProperty('createdAt')
    })

    it('returns 400 AlreadyCompleted when completing twice', async () => {
        const { client, apt, impression } = await setupImpressionScenario()

        await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'First response' }),
            }),
        )

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'Second response' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AlreadyCompleted')
    })

    it('returns 400 when response is empty', async () => {
        const { client, apt, impression } = await setupImpressionScenario()

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: '' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 when response is missing', async () => {
        const { client, apt, impression } = await setupImpressionScenario()

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 404 when appointment does not belong to client', async () => {
        const { apt, impression } = await setupImpressionScenario()
        const otherClient = await insertTestUser({ email: 'other@test.com' })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(otherClient.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'Test' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachment does not belong to appointment', async () => {
        const { client, psycho, apt } = await setupImpressionScenario()
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)
        const impression2 = await createAttachment({
            appointmentId: apt2.id,
            authorId: client.id,
            type: 'impression',
            text: 'Another impression',
        })

        // Try to complete impression2 under the first appointment's URL
        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression2.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'Test' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachment type is not impression', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)
        const note = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'A Note',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${note.id}/complete`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'Test' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when impression authored by someone else', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })
        await ClientsService.linkClientToPsycho(client1.id, psycho.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)
        const impression = await createAttachment({
            appointmentId: apt.id,
            authorId: client1.id,
            type: 'impression',
            text: 'Client1 impression',
        })

        // client2 tries to complete client1's impression
        // client2 won't own the appointment, so this will 404 at step 1
        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions/${impression.id}/complete`,
            await asUser(client2.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'Test' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 for psycho role', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/appointments/some-apt/impressions/some-id/complete',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ response: 'Test' }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request(
            '/api/client/appointments/some-apt/impressions/some-id/complete',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ response: 'Test' }),
            },
        )

        expect(res.status).toBe(401)
    })
})
