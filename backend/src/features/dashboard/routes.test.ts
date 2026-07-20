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

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

describe('GET /api/psycho/dashboard', () => {
    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/psycho/dashboard', {
            headers: { ...PSYCHO_HEADER },
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 when Helpsycho-User-Role: client header is sent', async () => {
        const user = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(user.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 200 with zeroed counts and empty arrays when psychologist has no clients and no appointments', async () => {
        const psycho = await insertTestUser({
            email: 'psycho-empty@test.com',
            activeRole: 'psycho',
        })

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('totalClients', 0)
        expect(body).toHaveProperty('totalUpcomingAppointments', 0)
        expect(body).toHaveProperty('totalPastAppointments', 0)
        expect(body).toHaveProperty('activeAppointment', null)
        expect(body).toHaveProperty('upcomingAppointments')
        expect(Array.isArray(body.upcomingAppointments)).toBe(true)
        expect(body.upcomingAppointments.length).toBe(0)
        expect(body).toHaveProperty('recentClients')
        expect(Array.isArray(body.recentClients)).toBe(true)
        expect(body.recentClients.length).toBe(0)
    })

    it('happy path: returns correct shape when psychologist has clients, upcoming, past, and active appointments', async () => {
        const psycho = await insertTestUser({
            email: 'psycho-happy@test.com',
            activeRole: 'psycho',
        })
        const client = await insertTestUser({
            email: 'client-happy@test.com',
            activeRole: 'client',
        })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        // Past appointment
        const past = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(365),
            endTime: pastDate(365, 11),
        })
        await startAppointment(past.id)
        await endAppointment(past.id)

        // Upcoming appointment
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(150),
            endTime: futureDate(150, 11),
        })

        // Active appointment
        const active = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(180),
            endTime: futureDate(180, 11),
        })
        await startAppointment(active.id)

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)

        expect(body.totalClients).toBe(1)
        expect(body.totalPastAppointments).toBe(1)
        expect(body.upcomingAppointments.length).toBeGreaterThanOrEqual(1)
        expect(body.activeAppointment).not.toBeNull()
        expect(body.activeAppointment).toHaveProperty('id', active.id)
        expect(body.activeAppointment).toHaveProperty('clientName')
        expect(body.recentClients.length).toBe(1)
    })

    it('activeAppointment is null when no appointment has been started but not ended', async () => {
        const psycho = await insertTestUser({
            email: 'psycho-noactive@test.com',
            activeRole: 'psycho',
        })
        const client = await insertTestUser({
            email: 'client-noactive@test.com',
            activeRole: 'client',
        })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(150),
            endTime: futureDate(150, 11),
        })

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.activeAppointment).toBeNull()
    })

    it('activeAppointment is populated with clientName when exactly one appointment is active', async () => {
        const psycho = await insertTestUser({
            email: 'psycho-active@test.com',
            activeRole: 'psycho',
        })
        const client = await insertTestUser({
            email: 'client-active@test.com',
            activeRole: 'client',
        })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const active = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(210),
            endTime: futureDate(210, 11),
        })
        await startAppointment(active.id)

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.activeAppointment).not.toBeNull()
        expect(body.activeAppointment).toHaveProperty('id', active.id)
        expect(body.activeAppointment).toHaveProperty('clientName')
        expect(typeof body.activeAppointment.clientName).toBe('string')
    })

    it('upcomingAppointments is limited to 5 and ordered ascending by start_time', async () => {
        const psycho = await insertTestUser({
            email: 'psycho-limit@test.com',
            activeRole: 'psycho',
        })
        const client = await insertTestUser({
            email: 'client-limit@test.com',
            activeRole: 'client',
        })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const startTimes = [
            futureDate(60),
            futureDate(90),
            futureDate(120),
            futureDate(150),
            futureDate(180),
            futureDate(210),
        ]

        for (const startTime of startTimes) {
            await createAppointment({
                psychoId: psycho.id,
                clientId: client.id,
                startTime,
                endTime: startTime.replace('10:00', '11:00'),
            })
        }

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.upcomingAppointments.length).toBe(5)

        // Check ascending order
        for (let i = 1; i < body.upcomingAppointments.length; i++) {
            const prev = new Date(body.upcomingAppointments[i - 1].startTime).getTime()
            const curr = new Date(body.upcomingAppointments[i].startTime).getTime()
            expect(prev).toBeLessThanOrEqual(curr)
        }
    })

    it('recentClients is limited to 5', async () => {
        const psycho = await insertTestUser({
            email: 'psycho-rclients@test.com',
            activeRole: 'psycho',
        })

        for (let i = 1; i <= 6; i++) {
            const client = await insertTestUser({
                email: `recent-client-${i}@test.com`,
                activeRole: 'client',
            })
            await ClientsService.linkClientToPsycho(client.id, psycho.id)

            const apt = await createAppointment({
                psychoId: psycho.id,
                clientId: client.id,
                startTime: `202${i}-01-01T10:00:00.000Z`,
                endTime: `202${i}-01-01T11:00:00.000Z`,
            })
            await startAppointment(apt.id)
            await endAppointment(apt.id)
        }

        const res = await app.request(
            '/api/psycho/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.recentClients.length).toBe(5)
    })
})
