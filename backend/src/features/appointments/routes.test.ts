import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { testDb } from '../../test-fixtures/db'
import { futureDate, pastDate } from '../../test-fixtures/dates'
import { linkClientToPsycho } from '../clients/services'
import {
    createAppointment,
    endAppointment,
    findAppointmentByIdForParticipant,
    startAppointment,
} from './services'

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
                    startTime: futureDate(7),
                    endTime: futureDate(7, 11),
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
                body: JSON.stringify({ endTime: futureDate(7, 11) }),
            }),
        )

        expect(res.status).toBe(400)
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
                body: JSON.stringify({ startTime: futureDate(7) }),
            }),
        )

        expect(res.status).toBe(400)
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
                    startTime: futureDate(7, 11),
                    endTime: futureDate(7),
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
                    startTime: futureDate(7),
                    endTime: futureDate(7, 11),
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
                startTime: futureDate(7),
                endTime: futureDate(7, 11),
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
                    startTime: futureDate(7),
                    endTime: futureDate(7, 11),
                }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 409 AppointmentConflict when psycho has an overlapping appointment with a different client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const clientA = await insertTestUser({ email: 'clientA@test.com' })
        const clientB = await insertTestUser({ email: 'clientB@test.com' })
        await linkClientToPsycho(clientA.id, psycho.id)
        await linkClientToPsycho(clientB.id, psycho.id)
        const existing = await createAppointment({
            psychoId: psycho.id,
            clientId: clientA.id,
            startTime: futureDate(7, 10),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${clientB.id}/appointments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(7, 10),
                    endTime: futureDate(7, 11),
                }),
            }),
        )

        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentConflict')
        expect(body).toHaveProperty('conflictingAppointmentId', existing.id)
        expect(body).toHaveProperty('conflictParticipant', 'psycho')
    })

    it('returns 409 AppointmentConflict when client has an overlapping appointment with another psycho', async () => {
        const psychoA = await insertTestUser({ email: 'psychoA@test.com' })
        const psychoB = await insertTestUser({ email: 'psychoB@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psychoA.id)
        await linkClientToPsycho(client.id, psychoB.id)
        const existing = await createAppointment({
            psychoId: psychoA.id,
            clientId: client.id,
            startTime: futureDate(7, 10),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments`,
            await asUser(psychoB.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(7, 10),
                    endTime: futureDate(7, 11),
                }),
            }),
        )

        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentConflict')
        expect(body).toHaveProperty('conflictingAppointmentId', existing.id)
        expect(body).toHaveProperty('conflictParticipant', 'client')
    })

    it('returns 409 AppointmentConflict when the psycho is also a client in an overlapping appointment', async () => {
        // User X is both a psychologist (to client C) and a client (of psycho Y).
        // If X is booked as a client with Y at 10-11, X cannot book C at the same time.
        const userX = await insertTestUser({ email: 'userX@test.com' })
        const userY = await insertTestUser({ email: 'userY@test.com' })
        const clientC = await insertTestUser({ email: 'clientC@test.com' })
        await linkClientToPsycho(clientC.id, userX.id)
        await linkClientToPsycho(userX.id, userY.id)
        await createAppointment({
            psychoId: userY.id,
            clientId: userX.id,
            startTime: futureDate(7, 10),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${clientC.id}/appointments`,
            await asUser(userX.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(7, 10),
                    endTime: futureDate(7, 11),
                }),
            }),
        )

        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentConflict')
        expect(body).toHaveProperty('conflictParticipant', 'psycho')
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(8),
                    endTime: futureDate(8, 11),
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
                body: JSON.stringify({ startTime: futureDate(8) }),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: futureDate(8) }),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: futureDate(8) }),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(8, 12),
                    endTime: futureDate(8),
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
            body: JSON.stringify({ startTime: futureDate(8) }),
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
                body: JSON.stringify({ startTime: futureDate(8) }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 200 with partial update when only startTime is sent', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ startTime: futureDate(7, 9) }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('startTime', futureDate(7, 9))
        // endTime stays unchanged
        expect(body.appointment).toHaveProperty('endTime', futureDate(7, 11))
    })

    it('returns 200 with manual meet link override without reschedule flag', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
            googleMeetLink: null,
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    googleMeetLink: 'https://meet.google.com/manual-link',
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty(
            'googleMeetLink',
            'https://meet.google.com/manual-link',
        )
        expect(body).toHaveProperty('meetRescheduleFailed', false)
    })

    it('returns 200 with meetRescheduleFailed false when rescheduleGoogleMeet is false', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
            googleMeetLink: 'https://meet.google.com/existing-link',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(8),
                    endTime: futureDate(8, 11),
                    rescheduleGoogleMeet: false,
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('startTime', futureDate(8))
        expect(body).toHaveProperty('meetRescheduleFailed', false)
        // existing google meet link is preserved unchanged
        expect(body.appointment).toHaveProperty(
            'googleMeetLink',
            'https://meet.google.com/existing-link',
        )
    })

    it('returns 200 meetRescheduleFailed true when rescheduleGoogleMeet true and no googleCalendarEventId, no Google account', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
            googleMeetLink: 'https://meet.google.com/old-link',
        })
        // No googleCalendarEventId set (it's null by default), no Google OAuth account in test DB

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(8),
                    endTime: futureDate(8, 11),
                    rescheduleGoogleMeet: true,
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('meetRescheduleFailed', true)
        // appointment times are still updated
        expect(body.appointment).toHaveProperty('startTime', futureDate(8))
    })

    it('returns 502 MeetRescheduleFailed when rescheduleGoogleMeet true and has googleCalendarEventId but no valid token', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const originalStart = futureDate(7)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: originalStart,
            endTime: futureDate(7, 11),
            googleMeetLink: 'https://meet.google.com/old-link',
        })
        // Directly set googleCalendarEventId via testDb
        await testDb`UPDATE appointments SET google_calendar_event_id = 'fake-event-id-123' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(8),
                    endTime: futureDate(8, 11),
                    rescheduleGoogleMeet: true,
                }),
            }),
        )

        expect(res.status).toBe(502)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'MeetRescheduleFailed')
        expect(body).toHaveProperty('googleCalendarEventId', 'fake-event-id-123')
        // appointment times must NOT have been updated — DB and Google Calendar must stay in sync
        const [row] =
            await testDb`SELECT start_time, google_calendar_event_id FROM appointments WHERE id = ${apt.id}`
        expect(new Date(row.start_time).toISOString()).toBe(new Date(originalStart).toISOString())
        expect(row.google_calendar_event_id).toBe('fake-event-id-123')
    })

    it('returns 409 AppointmentConflict when PATCH moves appointment into another appointment window', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7, 10),
            endTime: futureDate(7, 11),
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7, 14),
            endTime: futureDate(7, 15),
        })

        // Move apt2 into apt1's window
        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt2.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(7, 10),
                    endTime: futureDate(7, 11),
                }),
            }),
        )

        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentConflict')
        expect(body).toHaveProperty('conflictingAppointmentId', apt1.id)
    })

    it('returns 200 when PATCH keeps appointment in its own time window (excludeAppointmentId works)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7, 10),
            endTime: futureDate(7, 12),
        })

        // Shrink the window — should NOT conflict with itself
        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(7, 10),
                    endTime: futureDate(7, 11),
                }),
            }),
        )

        expect(res.status).toBe(200)
    })

    it('returns 200 meetRescheduleFailed true when rescheduleGoogleMeet true on appointment with no meet link, no Google account', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
            googleMeetLink: null,
        })
        // No googleCalendarEventId, no meet link, no Google account

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    startTime: futureDate(8),
                    endTime: futureDate(8, 11),
                    rescheduleGoogleMeet: true,
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('meetRescheduleFailed', true)
        // appointment is still updated
        expect(body.appointment).toHaveProperty('startTime', futureDate(8))
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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

    it('returns 200 { success: true, meetDeleteFailed: true } when googleCalendarEventId is set and no OAuth account', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await testDb`UPDATE appointments SET google_calendar_event_id = 'evt_123' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('success', true)
        expect(body).toHaveProperty('meetDeleteFailed', true)
        // DB row is gone regardless of calendar failure
        const rows = await testDb`SELECT id FROM appointments WHERE id = ${apt.id}`
        expect(rows).toHaveLength(0)
    })
})

describe('GET /api/clients/:clientId/appointments', () => {
    it('returns 200 with appointments array when client is linked and appointments exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(30),
            endTime: pastDate(30, 11),
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)
        const apt3 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(14, 9),
            endTime: futureDate(7, 11),
        })
        await testDb`UPDATE appointments SET started_at = NOW() - INTERVAL '30 minutes' WHERE id = ${apt3.id}`

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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
        expect(body).toHaveProperty(
            'message',
            'Only upcoming or warning appointments can be started.',
        )
    })

    it('returns 400 AppointmentNotStartable for already active appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client2.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
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

describe('GET /api/client/appointments (client)', () => {
    it('returns 200 with appointments including psychoName on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', name: 'Dr. Smith' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(30),
            endTime: pastDate(30, 11),
        })

        const res = await app.request(
            '/api/client/appointments',
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
            '/api/client/appointments',
            await asUser(client.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toEqual([])
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/client/appointments')
        expect(res.status).toBe(401)
    })

    it('returns 403 for psycho-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/appointments',
            await asUser(user.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})

describe('GET /api/client/appointments/:appointmentId (client)', () => {
    it('returns 200 with appointment including psychoName on happy path', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', name: 'Dr. Smith' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}`,
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
            '/api/client/appointments/nonexistent',
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}`,
            await asUser(client2.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/client/appointments/some-apt')
        expect(res.status).toBe(401)
    })

    it('returns 403 for psycho-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/appointments/some-apt',
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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

    it('returns 200 with whiteboardSnapshotUrl when snapshotDataUrl is provided', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const snapshotDataUrl =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ snapshotDataUrl }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'past')
        expect(body.appointment).toHaveProperty('whiteboardSnapshotUrl', snapshotDataUrl)
    })

    it('returns 400 when snapshotDataUrl exceeds 2 MB', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const snapshotDataUrl = 'data:image/png;base64,' + 'A'.repeat(2_800_001)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ snapshotDataUrl }),
            }),
        )

        expect(res.status).toBe(400)
        // Handler must not have reached endAppointmentWithSnapshot — ended_at stays NULL
        const [row] = await testDb`SELECT ended_at FROM appointments WHERE id = ${apt.id}`
        expect(row.ended_at).toBeNull()
    })

    it('returns 400 when snapshotDataUrl uses a disallowed mime type', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ snapshotDataUrl: 'data:image/svg+xml;base64,AAAA' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 200 with whiteboardSnapshotUrl null when body is empty', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointment')
        expect(body.appointment).toHaveProperty('status', 'past')
        expect(body.appointment).toHaveProperty('whiteboardSnapshotUrl', null)
    })

    it('clears whiteboard_elements and whiteboard_files on end', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        // Seed whiteboard state directly
        await testDb`
            UPDATE appointments
            SET whiteboard_elements = ${JSON.stringify([{ id: 'el1', type: 'rectangle' }])}::jsonb,
                whiteboard_files    = ${JSON.stringify({ 'file-1': { id: 'file-1' } })}::jsonb
            WHERE id = ${apt.id}
        `

        await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/end`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        const [row] = await testDb`
            SELECT whiteboard_elements, whiteboard_files FROM appointments WHERE id = ${apt.id}
        `
        expect(row.whiteboard_elements).toBeNull()
        expect(row.whiteboard_files).toBeNull()
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
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
            startTime: pastDate(14, 9),
            endTime: futureDate(7, 11),
        })
        await testDb`UPDATE appointments SET started_at = NOW() - INTERVAL '30 minutes' WHERE id = ${apt.id}`

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

describe('findAppointmentByIdForParticipant', () => {
    it('returns appointment when user is the psychologist (psycho_id match)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const result = await findAppointmentByIdForParticipant(apt.id, psycho.id)

        expect(result).not.toBeNull()
        expect(result?.id).toBe(apt.id)
        expect(result?.psychoId).toBe(psycho.id)
        expect(result?.clientId).toBe(client.id)
    })

    it('returns appointment when user is the client (client_id match)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const result = await findAppointmentByIdForParticipant(apt.id, client.id)

        expect(result).not.toBeNull()
        expect(result?.id).toBe(apt.id)
        expect(result?.psychoId).toBe(psycho.id)
        expect(result?.clientId).toBe(client.id)
    })

    it('returns null when user is neither the psychologist nor the client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const outsider = await insertTestUser({ email: 'outsider@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const result = await findAppointmentByIdForParticipant(apt.id, outsider.id)

        expect(result).toBeNull()
    })

    it('returns null when appointment ID does not exist', async () => {
        const user = await insertTestUser({ email: 'user@test.com' })

        const result = await findAppointmentByIdForParticipant('nonexistent-id', user.id)

        expect(result).toBeNull()
    })
})

describe('GET /:appointmentId — time-based status computation', () => {
    it('returns status warning when start_time has passed but started_at is null and end_time has not passed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        // Backdate start_time to past, keep end_time in the future, started_at stays null
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '10 minutes', end_time = NOW() + INTERVAL '50 minutes' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('status', 'warning')
    })

    it('returns status missed when end_time has passed and started_at is null', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        // Both times in the past, started_at stays null
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '2 hours', end_time = NOW() - INTERVAL '1 hour' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('status', 'missed')
    })

    it('returns status active when started_at is not null and end_time has not passed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '30 minutes', end_time = NOW() + INTERVAL '30 minutes', started_at = NOW() - INTERVAL '25 minutes' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('status', 'active')
    })

    it('returns status past when started_at is not null and ended_at is not null', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '90 minutes', end_time = NOW() - INTERVAL '30 minutes', started_at = NOW() - INTERVAL '85 minutes', ended_at = NOW() - INTERVAL '35 minutes' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('status', 'past')
    })

    it("status stays 'active' for overrun session (started, not yet ended, end_time elapsed)", async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        // started but ended_at is null; end_time is in the past — session is overrun but still active
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '2 hours', end_time = NOW() - INTERVAL '1 hour', started_at = NOW() - INTERVAL '115 minutes' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('status', 'active')
    })

    it('PATCH /start returns 200 when appointment status is warning', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        // In warning window: start_time passed, end_time not yet, started_at null
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '10 minutes', end_time = NOW() + INTERVAL '50 minutes' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('status', 'active')
    })

    it('PATCH /start returns 400 AppointmentNotStartable when status is missed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        // Missed: both times in past, started_at null
        await testDb`UPDATE appointments SET start_time = NOW() - INTERVAL '2 hours', end_time = NOW() - INTERVAL '1 hour' WHERE id = ${apt.id}`

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/start`,
            await asUser(psycho.id, { method: 'PATCH', headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotStartable')
    })

    it('response includes startedAt and endedAt fields', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}`,
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointment).toHaveProperty('startedAt', null)
        expect(body.appointment).toHaveProperty('endedAt', null)
    })
})

// Note: The WebSocket route (whiteboardRoutes at GET /api/whiteboard/:appointmentId)
// cannot be integration-tested with Hono's app.request() pattern because
// upgradeWebSocket requires Bun's native HTTP server to perform the protocol upgrade.
// Manual/integration testing is required for the WS route.
describe('GET /api/whiteboard/:appointmentId (WebSocket)', () => {
    it('is not unit-testable via app.request() — upgradeWebSocket requires native Bun HTTP server', () => {
        // This is a documented limitation. See EDG-46 implementation plan.
        expect(true).toBe(true)
    })
})

describe('GET /api/psycho/appointments/all', () => {
    it('returns 200 with appointments array including clientName when psycho has appointments', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com', name: 'Test Client' })
        await linkClientToPsycho(client.id, psycho.id)
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            '/api/psycho/appointments/all',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toHaveLength(1)
        expect(body.appointments[0]).toHaveProperty('clientName', 'Test Client')
        expect(body.appointments[0]).toHaveProperty('clientId', client.id)
        expect(body.appointments[0]).toHaveProperty('psychoId', psycho.id)
    })

    it('returns 200 with empty appointments array when psycho has no appointments', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/psycho/appointments/all',
            await asUser(psycho.id, { headers: PSYCHO_HEADER }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('appointments')
        expect(body.appointments).toEqual([])
    })

    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/psycho/appointments/all')
        expect(res.status).toBe(401)
    })

    it('returns 403 for client-role request', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/psycho/appointments/all',
            await asUser(user.id, { headers: CLIENT_HEADER }),
        )

        expect(res.status).toBe(403)
    })
})
