import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { jsonBody } from '../../test-fixtures/responses'
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

// ─── GET /api/clients/:clientId/progress/impressions ──────────────────────────

describe('GET /api/clients/:clientId/progress/impressions', () => {
    it('happy path — returns all impressions across all appointments, each with appointmentStartTime', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)

        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(14),
            endTime: futureDate(14, 11),
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        await createAttachment({
            appointmentId: apt1.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'First appointment impression',
        })
        await createAttachment({
            appointmentId: apt2.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'Second appointment impression',
        })

        const res = await app.request(
            `/api/clients/${client.id}/progress/impressions`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('impressions')
        expect(body.impressions).toHaveLength(2)
        // ordered by created_at ASC
        expect(body.impressions[0]).toHaveProperty('text', 'First appointment impression')
        expect(body.impressions[1]).toHaveProperty('text', 'Second appointment impression')
        // each item has appointmentStartTime
        expect(body.impressions[0]).toHaveProperty('appointmentStartTime')
        expect(body.impressions[1]).toHaveProperty('appointmentStartTime')
        // appointmentId is present
        expect(body.impressions[0]).toHaveProperty('appointmentId', apt1.id)
        expect(body.impressions[1]).toHaveProperty('appointmentId', apt2.id)
    })

    it('returns 200 with empty array when client has appointments but no impressions', async () => {
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

        const res = await app.request(
            `/api/clients/${client.id}/progress/impressions`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('impressions')
        expect(body.impressions).toHaveLength(0)
    })

    it('returns 400 ClientNotLinked when clientId does not belong to requesting psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const otherClient = await insertTestUser({ email: 'other@test.com' })

        const res = await app.request(
            `/api/clients/${otherClient.id}/progress/impressions`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'ClientNotLinked')
    })

    it('IDOR — impressions from other psychologist-client pairs do not appear', async () => {
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })

        await ClientsService.linkClientToPsycho(client1.id, psycho1.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho2.id)

        const apt1 = await createAppointment({
            psychoId: psycho1.id,
            clientId: client1.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)

        const apt2 = await createAppointment({
            psychoId: psycho2.id,
            clientId: client2.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        await createAttachment({
            appointmentId: apt1.id,
            authorId: client1.id,
            type: 'impression',
            name: null,
            text: 'Client1 impression',
        })
        await createAttachment({
            appointmentId: apt2.id,
            authorId: client2.id,
            type: 'impression',
            name: null,
            text: 'Client2 impression — should NOT appear',
        })

        const res = await app.request(
            `/api/clients/${client1.id}/progress/impressions`,
            await asUser(psycho1.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.impressions).toHaveLength(1)
        expect(body.impressions[0]).toHaveProperty('text', 'Client1 impression')
    })

    it('returns 403 when Helpsycho-User-Role is client', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/progress/impressions',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request('/api/clients/some-client/progress/impressions', {
            method: 'GET',
            headers: { ...PSYCHO_HEADER },
        })

        expect(res.status).toBe(401)
    })
})
