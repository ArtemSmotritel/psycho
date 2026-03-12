import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { linkClientToPsycho } from '../clients/services'
import { createAppointment, endAppointment, startAppointment } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

describe('POST /api/clients/:clientId/appointments', () => {
    it('returns 201 with appointment on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: '2026-04-01T10:00:00.000Z',
                    endTime: '2026-04-01T11:00:00.000Z',
                }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'upcoming')
        expect(body.appointment).toHaveProperty('googleMeetLink', null)
        expect(body.appointment).toHaveProperty('clientId', client.id)
        expect(body.appointment).toHaveProperty('psychoId', psycho.id)
    })

    it('returns 400 BadRequest when startTime is missing', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ endTime: '2026-04-01T11:00:00.000Z' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'startTime is required')
    })

    it('returns 400 BadRequest when endTime is missing', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: '2026-04-01T10:00:00.000Z' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'endTime is required')
    })

    it('returns 400 BadRequest when endTime <= startTime', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: '2026-04-01T11:00:00.000Z',
                    endTime: '2026-04-01T10:00:00.000Z',
                }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'endTime must be after startTime')
    })

    it('returns 400 ClientNotLinked when client is not linked to psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: '2026-04-01T10:00:00.000Z',
                    endTime: '2026-04-01T11:00:00.000Z',
                }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'ClientNotLinked')
        expect(body).toHaveProperty('message', 'This client is not in your list.')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: '2026-04-01T10:00:00.000Z',
                endTime: '2026-04-01T11:00:00.000Z',
            }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({
                    startTime: '2026-04-01T10:00:00.000Z',
                    endTime: '2026-04-01T11:00:00.000Z',
                }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

describe('PATCH /api/clients/:clientId/appointments/:appointmentId', () => {
    it('returns 200 with updated appointment on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: '2026-04-02T10:00:00.000Z',
                    endTime: '2026-04-02T11:00:00.000Z',
                    googleMeetLink: 'https://meet.google.com/abc',
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('googleMeetLink', 'https://meet.google.com/abc')
    })

    it('returns 404 NotFound when appointment does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/nonexistent`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
            }),
        )

        expect(res.status).toBe(404)
        const resBody = await res.json()
        expect(resBody).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotEditable for past appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
            }),
        )

        expect(res.status).toBe(400)
        const resBody = await res.json()
        expect(resBody).toHaveProperty('error', 'AppointmentNotEditable')
        expect(resBody).toHaveProperty('message', 'Only upcoming appointments can be edited.')
    })

    it('returns 400 AppointmentNotEditable for active appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotEditable')
    })

    it('returns 400 BadRequest when merged endTime is before merged startTime', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: '2026-04-02T12:00:00.000Z',
                    endTime: '2026-04-02T10:00:00.000Z',
                }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'BadRequest')
        expect(body).toHaveProperty('message', 'endTime must be after startTime')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ startTime: '2026-04-02T10:00:00.000Z' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

describe('DELETE /api/clients/:clientId/appointments/:appointmentId', () => {
    it('returns 200 { success: true } on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('success', true)
    })

    it('returns 404 NotFound when appointment does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/nonexistent`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotDeletable for past appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotDeletable')
        expect(body).toHaveProperty('message', 'Only upcoming appointments can be deleted.')
    })

    it('returns 400 AppointmentNotDeletable for active appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotDeletable')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt', {
            method: 'DELETE',
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt',
            await asUser(user.id, { method: 'DELETE', headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients/:clientId/appointments', () => {
    it('returns 200 with appointments array when client is linked and appointments exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-03-01T10:00:00.000Z',
            endTime: '2026-03-01T11:00:00.000Z',
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)
        const apt3 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-03-10T09:00:00.000Z',
            endTime: '2026-03-10T10:00:00.000Z',
        })
        await startAppointment(apt3.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toHaveLength(3)
        const statuses = body.appointments.map((a: any) => a.status)
        expect(statuses).toContain('upcoming')
        expect(statuses).toContain('past')
        expect(statuses).toContain('active')
    })

    it('returns 200 with empty appointments array when client is linked but has no appointments', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toEqual([])
    })

    it('returns 400 ClientNotLinked when client is not linked to psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'ClientNotLinked')
        expect(body).toHaveProperty('message', 'This client is not in your list.')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments')
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/clients/:clientId/appointments/:appointmentId', () => {
    it('returns 200 with appointment on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('id', apt.id)
        expect(body.appointment).toHaveProperty('status', 'upcoming')
    })

    it('returns 404 when appointment does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/nonexistent`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when psychoId does not match', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho2.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt')
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/start', () => {
    it('returns 200 with appointment status active on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'active')
    })

    it('returns 404 when appointment does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/nonexistent/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotStartable for past appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotStartable')
        expect(body).toHaveProperty('message', 'Only upcoming appointments can be started.')
    })

    it('returns 400 AppointmentNotStartable for already active appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotStartable')
    })

    it('returns 400 AnotherAppointmentActive with activeAppointmentId when another is active', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })
        await linkClientToPsycho(client1.id, psycho.id)
        await linkClientToPsycho(client2.id, psycho.id)
        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client2.id,
            startTime: '2026-04-02T10:00:00.000Z',
            endTime: '2026-04-02T11:00:00.000Z',
        })
        await startAppointment(apt1.id)

        const res = await app.request(
            `/api/clients/${client2.id}/appointments/${apt2.id}/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AnotherAppointmentActive')
        expect(body).toHaveProperty(
            'message',
            'End your active appointment before starting a new one.',
        )
        expect(body).toHaveProperty('activeAppointmentId', apt1.id)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt/start', {
            method: 'PATCH',
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/start',
            await asUser(user.id, { method: 'PATCH', headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/appointments (client)', () => {
    it('returns 200 with appointments including psychoName on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', name: 'Dr. Smith' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-03-01T10:00:00.000Z',
            endTime: '2026-03-01T11:00:00.000Z',
        })

        const res = await app.request(
            '/api/appointments',
            await asUser(client.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toHaveLength(2)
        expect(body.appointments[0]).toHaveProperty('psychoName', 'Dr. Smith')
        expect(body.appointments[1]).toHaveProperty('psychoName', 'Dr. Smith')
    })

    it('returns 200 with empty appointments array when client has no appointments', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/appointments',
            await asUser(client.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toEqual([])
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/appointments')
        expect(res.status).toBe(401)
    })

    it('returns 403 for psycho-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/appointments',
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/appointments/:appointmentId (client)', () => {
    it('returns 200 with appointment including psychoName on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', name: 'Dr. Smith' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/appointments/${apt.id}`,
            await asUser(client.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('id', apt.id)
        expect(body.appointment).toHaveProperty('psychoName', 'Dr. Smith')
    })

    it('returns 404 when appointment is not found', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/appointments/nonexistent',
            await asUser(client.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 404 when appointment belongs to a different client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })
        await linkClientToPsycho(client1.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/appointments/${apt.id}`,
            await asUser(client2.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/appointments/some-apt')
        expect(res.status).toBe(401)
    })

    it('returns 403 for psycho-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/appointments/some-apt',
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/end', () => {
    it('returns 200 with status past on happy path (active appointment)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'past')
    })

    it('returns 404 when appointment does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/nonexistent/end`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'NotFound')
    })

    it('returns 400 AppointmentNotEndable for upcoming appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotEndable')
        expect(body).toHaveProperty('message', 'Only active appointments can be ended.')
    })

    it('returns 400 AppointmentNotEndable for past appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotEndable')
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt/end', {
            method: 'PATCH',
        })
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/end',
            await asUser(user.id, { method: 'PATCH', headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/psycho/appointments', () => {
    it('returns 200 with active appointment when one exists', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-03-10T09:00:00.000Z',
            endTime: '2026-03-10T10:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            '/api/psycho/appointments',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('id', apt.id)
        expect(body.appointment).toHaveProperty('status', 'active')
    })

    it('returns 200 with null appointment when none active', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/psycho/appointments',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment', null)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/psycho/appointments')
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/psycho/appointments',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})
