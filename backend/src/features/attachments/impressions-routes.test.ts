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

// ─── POST /api/client/appointments/:appointmentId/impressions ────────────────────────

describe('POST /api/client/appointments/:appointmentId/impressions', () => {
    it('returns 201 with type impression when appointment is active', async () => {
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

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ text: 'Felt anxious but better now.' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('impression')
        expect(body.impression).toHaveProperty('type', 'impression')
        expect(body.impression).toHaveProperty('text', 'Felt anxious but better now.')
        expect(body.impression).toHaveProperty('authorId', client.id)
        expect(body.impression).toHaveProperty('appointmentId', apt.id)
    })

    it('returns 201 when appointment is past', async () => {
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
            `/api/client/appointments/${apt.id}/impressions`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ text: 'Reflection on past appointment.' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('impression')
        expect(body.impression).toHaveProperty('type', 'impression')
    })

    it('returns 400 AppointmentNotStarted when appointment is upcoming', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ text: 'Not started yet.' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotStarted')
    })

    it('returns 400 when no content fields provided', async () => {
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

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
    })

    it('returns 404 when appointmentId does not belong to this client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const otherClient = await insertTestUser({ email: 'other@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        // otherClient tries to post impression on client's appointment
        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions`,
            await asUser(otherClient.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ text: 'IDOR attempt.' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when appointmentId belongs to a different client (IDOR attempt)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const attacker = await insertTestUser({ email: 'attacker@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/impressions`,
            await asUser(attacker.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ text: 'Trying to access.' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request('/api/client/appointments/some-apt/impressions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
            body: JSON.stringify({ text: 'Hello' }),
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 with psycho role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/appointments/some-apt/impressions',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ text: 'Hello' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})
