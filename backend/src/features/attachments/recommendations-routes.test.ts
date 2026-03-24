import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { insertTestFile } from '../../test-fixtures/files'
import { linkClientToPsycho } from '../clients/services'
import { createAppointment, startAppointment, endAppointment } from '../appointments/services'
import { createAttachment } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── POST /api/clients/:clientId/appointments/:appointmentId/recommendations ──

describe('POST /api/clients/:clientId/appointments/:appointmentId/recommendations', () => {
    it('returns 201 with type recommendation when appointment is active', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'My Recommendation', text: 'Do this daily.' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('recommendation')
        expect(body.recommendation).toHaveProperty('name', 'My Recommendation')
        expect(body.recommendation).toHaveProperty('text', 'Do this daily.')
        expect(body.recommendation).toHaveProperty('type', 'recommendation')
        expect(body.recommendation).toHaveProperty('authorId', psycho.id)
        expect(body.recommendation).toHaveProperty('appointmentId', apt.id)
    })

    it('returns 201 when appointment is past', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'photo.png' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    name: 'Past Recommendation',
                    imageFileIds: [file.id],
                }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('recommendation')
        expect(body.recommendation).toHaveProperty('type', 'recommendation')
        expect(body.recommendation.imageFiles).toHaveLength(1)
        expect(body.recommendation.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 400 AppointmentNotActive when upcoming', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Recommendation' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })

    it('returns 400 BadRequest when name is missing', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ text: 'No name' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 404 when appointmentId does not belong to this psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho2.id)
        const apt = await createAppointment({
            psychoId: psycho2.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Recommendation' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when clientId URL param does not match the appointment actual client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const otherClient = await insertTestUser({ email: 'other@test.com' })
        await linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${otherClient.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Recommendation' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Recommendation' }),
            },
        )

        expect(res.status).toBe(401)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ name: 'Recommendation' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

// ─── GET /api/clients/:clientId/appointments/:appointmentId/recommendations ───

describe('GET /api/clients/:clientId/appointments/:appointmentId/recommendations', () => {
    it('returns 200 with only this psycho recommendations (not another psycho)', async () => {
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
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        // Recommendation by psycho (should be visible)
        await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Psycho Recommendation',
        })
        // Recommendation by psycho2 on same appointment (should NOT be visible)
        await createAttachment({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'recommendation',
            name: 'Other Psycho Recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('recommendations')
        expect(body.recommendations).toHaveLength(1)
        expect(body.recommendations[0]).toHaveProperty('name', 'Psycho Recommendation')
        expect(body.recommendations[0]).toHaveProperty('authorId', psycho.id)
    })

    it('returns 200 { recommendations: [] } when none exist', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('recommendations')
        expect(body.recommendations).toHaveLength(0)
    })

    it('returns 404 when appointmentId does not belong to this psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await linkClientToPsycho(client.id, psycho2.id)
        const apt = await createAppointment({
            psychoId: psycho2.id,
            clientId: client.id,
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T11:00:00.000Z',
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when clientId does not match the appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const otherClient = await insertTestUser({ email: 'other@test.com' })
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
            `/api/clients/${otherClient.id}/appointments/${apt.id}/recommendations`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })
})

// ─── PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId ──

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId', () => {
    it('returns 200 with updated name/text; imageFileIds in body is ignored (unchanged in response)', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'original.png' })
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Original Name',
            text: 'Original Text',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    name: 'Updated Name',
                    text: 'Updated Text',
                    imageFileIds: ['some-other-id'],
                }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('recommendation')
        expect(body.recommendation).toHaveProperty('name', 'Updated Name')
        expect(body.recommendation).toHaveProperty('text', 'Updated Text')
        // imageFiles should NOT be changed (locked after creation)
        expect(body.recommendation.imageFiles).toHaveLength(1)
        expect(body.recommendation.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 404 when attachmentId belongs to a different appointment', async () => {
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
            startTime: '2026-04-02T10:00:00.000Z',
            endTime: '2026-04-02T11:00:00.000Z',
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        const recommendation = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation on apt2',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachmentId has type !== recommendation', async () => {
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

        const note = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'A Note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${note.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when recommendation was created by a different psychologist', async () => {
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
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'recommendation',
            name: 'Other psycho recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 400 AppointmentNotActive when upcoming', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/some-id`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })

    it('happy path — removeFileIds removes linked files from the recommendation', async () => {
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

        const file1 = await insertTestFile(psycho.id, { originalName: 'img1.png' })
        const file2 = await insertTestFile(psycho.id, { originalName: 'img2.png' })
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec with files',
            imageFileIds: [file1.id, file2.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ removeFileIds: [file1.id] }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.recommendation.imageFiles).toHaveLength(1)
        expect(body.recommendation.imageFiles[0]).toHaveProperty('id', file2.id)
    })

    it('removeFileIds with non-existent ids does not fail', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'img.png' })
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ removeFileIds: ['non-existent-id'] }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.recommendation.imageFiles).toHaveLength(1)
        expect(body.recommendation.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations/some-id',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

// ─── DELETE /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId ──

describe('DELETE /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId', () => {
    it('returns 200 { success: true }', async () => {
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

        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'To Delete',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('success', true)
    })

    it('returns 404 when attachmentId belongs to a different appointment', async () => {
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
            startTime: '2026-04-02T10:00:00.000Z',
            endTime: '2026-04-02T11:00:00.000Z',
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        const recommendation = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation on apt2',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when recommendation was created by a different psychologist', async () => {
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
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'recommendation',
            name: 'Other psycho recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations/some-id',
            await asUser(user.id, {
                method: 'DELETE',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })
})

// ─── GET /api/appointments/:appointmentId/recommendations ─────────────────────

describe('GET /api/appointments/:appointmentId/recommendations', () => {
    it('returns 200 with all recommendations for this appointment', async () => {
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

        await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation 1',
            text: 'Do yoga',
        })
        await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation 2',
            text: 'Drink water',
        })

        const res = await app.request(
            `/api/appointments/${apt.id}/recommendations`,
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('recommendations')
        expect(body.recommendations).toHaveLength(2)
    })

    it('returns 404 when appointmentId does not belong to this client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const otherClient = await insertTestUser({ email: 'other@test.com' })
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
            `/api/appointments/${apt.id}/recommendations`,
            await asUser(otherClient.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when client provides another client appointmentId', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        const attacker = await insertTestUser({ email: 'attacker@test.com' })
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
            `/api/appointments/${apt.id}/recommendations`,
            await asUser(attacker.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with psycho role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/appointments/some-apt/recommendations',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })
})
