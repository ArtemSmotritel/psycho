import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { linkClientToPsycho, unlinkClientFromPsycho } from '../clients/services'
import { createAppointment, startAppointment, endAppointment } from '../appointments/services'
import { createAttachment, upsertReaction } from '../attachments/services'

const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }
const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }

describe('GET /api/client/dashboard', () => {
    it('returns 401 for unauthenticated request', async () => {
        const res = await app.request('/api/client/dashboard', {
            headers: { ...CLIENT_HEADER },
        })

        expect(res.status).toBe(401)
    })

    it('returns 403 when called with psycho role header', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(psycho.id, {
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('happy path: returns nextAppointment, pendingRecommendations, and appointmentCounts', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const upcoming = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2030-04-01T10:00:00.000Z',
            endTime: '2030-04-01T11:00:00.000Z',
        })

        const past = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T11:00:00.000Z',
        })
        await startAppointment(past.id)
        await endAppointment(past.id)

        const recommendation = await createAttachment({
            appointmentId: past.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Exercise daily',
        })

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()

        expect(body).toHaveProperty('nextAppointment')
        expect(body.nextAppointment).toHaveProperty('id', upcoming.id)
        expect(body.nextAppointment).toHaveProperty('status', 'upcoming')
        expect(body.nextAppointment).toHaveProperty('psychoName')

        expect(body).toHaveProperty('pendingRecommendations')
        expect(Array.isArray(body.pendingRecommendations)).toBe(true)
        expect(body.pendingRecommendations.length).toBe(1)
        expect(body.pendingRecommendations[0]).toHaveProperty('id', recommendation.id)

        expect(body).toHaveProperty('appointmentCounts')
        expect(body.appointmentCounts).toHaveProperty('upcoming', 1)
        expect(body.appointmentCounts).toHaveProperty('past', 1)
        expect(body.appointmentCounts).toHaveProperty('active', 0)
    })

    it('nextAppointment is null when client has no upcoming or active appointments', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const past = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T11:00:00.000Z',
        })
        await startAppointment(past.id)
        await endAppointment(past.id)

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.nextAppointment).toBeNull()
    })

    it('pendingRecommendations contains only recommendations with done=false or no reaction', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const past = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T11:00:00.000Z',
        })
        await startAppointment(past.id)
        await endAppointment(past.id)

        // No reaction - should appear in pending
        const noReaction = await createAttachment({
            appointmentId: past.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'No reaction yet',
        })

        // done=false - should appear in pending
        const notDone = await createAttachment({
            appointmentId: past.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Not done',
        })
        await upsertReaction(notDone.id, { done: false })

        // done=true - should NOT appear in pending
        const done = await createAttachment({
            appointmentId: past.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Already done',
        })
        await upsertReaction(done.id, { done: true })

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()

        const pendingIds = body.pendingRecommendations.map((r: any) => r.id)
        expect(pendingIds).toContain(noReaction.id)
        expect(pendingIds).toContain(notDone.id)
        expect(pendingIds).not.toContain(done.id)
    })

    it('pendingRecommendations is empty array when no recommendations exist', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.pendingRecommendations).toEqual([])
    })

    it('does not return recommendations from appointments belonging to a different client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })
        await linkClientToPsycho(client1.id, psycho.id)
        await linkClientToPsycho(client2.id, psycho.id)

        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T11:00:00.000Z',
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)

        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client2.id,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T11:00:00.000Z',
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        await createAttachment({
            appointmentId: apt1.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation for client1',
        })

        const client2Rec = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation for client2',
        })

        // Request as client2 - should only see client2's recommendation
        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client2.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()

        const pendingIds = body.pendingRecommendations.map((r: any) => r.id)
        expect(pendingIds).toContain(client2Rec.id)
        expect(pendingIds.length).toBe(1)
    })

    it('psychologists is returned in the happy path with correct shape', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', name: 'Dr. Smith' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('psychologists')
        expect(Array.isArray(body.psychologists)).toBe(true)
        expect(body.psychologists.length).toBe(1)
        expect(body.psychologists[0]).toHaveProperty('id', psycho.id)
        expect(body.psychologists[0]).toHaveProperty('name', 'Dr. Smith')
        expect(body.psychologists[0]).toHaveProperty('email', 'psycho@test.com')
        expect(body.psychologists[0]).toHaveProperty('image')
    })

    it('psychologists returns multiple psychologists when client has several', async () => {
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho1.id)
        await linkClientToPsycho(client.id, psycho2.id)

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.psychologists.length).toBe(2)
        const ids = body.psychologists.map((p: any) => p.id)
        expect(ids).toContain(psycho1.id)
        expect(ids).toContain(psycho2.id)
    })

    it('psychologists is empty array when client has no linked psychologists', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.psychologists).toEqual([])
    })

    it('psychologists excludes disconnected psychologists', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        await unlinkClientFromPsycho(client.id, psycho.id)

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.psychologists).toEqual([])
    })

    it('appointmentCounts correctly reflects upcoming, active, and past counts', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho.id)

        // Create upcoming
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2030-04-01T10:00:00.000Z',
            endTime: '2030-04-01T11:00:00.000Z',
        })
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2030-05-01T10:00:00.000Z',
            endTime: '2030-05-01T11:00:00.000Z',
        })

        // Create past
        const past = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T11:00:00.000Z',
        })
        await startAppointment(past.id)
        await endAppointment(past.id)

        // Create active
        const active = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2030-06-01T10:00:00.000Z',
            endTime: '2030-06-01T11:00:00.000Z',
        })
        await startAppointment(active.id)

        const res = await app.request(
            '/api/client/dashboard',
            await asUser(client.id, {
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.appointmentCounts.upcoming).toBe(2)
        expect(body.appointmentCounts.past).toBe(1)
        expect(body.appointmentCounts.active).toBe(1)
    })
})
