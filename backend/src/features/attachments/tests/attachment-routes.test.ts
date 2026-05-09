import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { db } from 'config/db'
import { jsonBody } from '../../../test-fixtures/responses'
import { asUser, insertTestUser } from '../../../test-fixtures/users'
import { insertTestFile } from '../../../test-fixtures/files'
import { futureDate, pastDate } from '../../../test-fixtures/dates'
import { ClientsService } from '../../clients/services'
import {
    createAppointment,
    startAppointment,
    endAppointment,
} from '../../../test-fixtures/appointments'
import { AttachmentsService } from '../services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

describe('GET /api/clients/:clientId/appointments/:appointmentId/attachments/:attachmentId', () => {
    it('returns 200 with attachment for a note belonging to this psycho', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Test Note',
            text: 'Note text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('attachment')
        expect(body.attachment.id).toBe(note.id)
        expect(body.attachment.type).toBe('note')
    })

    it('returns 200 with attachment for a recommendation belonging to this psycho', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Test Recommendation',
            text: 'Recommendation text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('attachment')
        expect(body.attachment.id).toBe(recommendation.id)
        expect(body.attachment.type).toBe('recommendation')
    })

    it('returns 200 with attachment for an impression authored by the client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Client impression text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('attachment')
        expect(body.attachment.id).toBe(impression.id)
        expect(body.attachment.type).toBe('impression')
        expect(body.attachment.authorId).toBe(client.id)
    })

    it('returns 404 when attachmentId does not exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
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
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/00000000-0000-0000-0000-000000000000`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachment belongs to a different appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const aptA = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(aptA.id)
        await endAppointment(aptA.id)

        const aptB = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
        })
        await startAppointment(aptB.id)
        await endAppointment(aptB.id)

        const attachmentB = await AttachmentsService.create({
            appointmentId: aptB.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note on B',
            text: null,
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${aptA.id}/attachments/${attachmentB.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when appointment does not belong to the requesting psychologist', async () => {
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com', activeRole: 'psycho' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho2.id)

        const apt = await createAppointment({
            psychoId: psycho2.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const attachment = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'note',
            name: 'Some Note',
            text: null,
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${attachment.id}`,
            await asUser(psycho1.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 when Helpsycho-User-Role is client', async () => {
        const user = await insertTestUser({ activeRole: 'client' })

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments/some-attachment',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments/some-attachment',
            {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            },
        )

        expect(res.status).toBe(401)
    })

    it('returns reaction=null on a recommendation with no reaction', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation',
            text: 'Recommendation text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.id).toBe(recommendation.id)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toBeNull()
        expect(body).not.toHaveProperty('completion')
    })

    it('returns the reaction payload on a recommendation that has one', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation',
            text: 'Recommendation text',
        })

        await AttachmentsService.upsertReaction(recommendation.id, {
            done: true,
            comment: 'Got it',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.reaction).toMatchObject({
            attachmentId: recommendation.id,
            done: true,
            clientComment: 'Got it',
            psychologistReply: null,
        })
    })

    it('returns completion=null on an impression that has not been completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Impression text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.id).toBe(impression.id)
        expect(body).toHaveProperty('completion')
        expect(body.completion).toBeNull()
        expect(body).not.toHaveProperty('reaction')
    })

    it('returns the completion payload on an impression that has been completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Impression text',
        })

        await AttachmentsService.completeImpression(impression.id, 'Reflected on it')

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.completion).toMatchObject({
            attachmentId: impression.id,
            clientResponse: 'Reflected on it',
        })
        expect(body.completion.createdAt).toBeTruthy()
    })

    it('omits both reaction and completion on a note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
            text: 'Note text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.id).toBe(note.id)
        expect(body).not.toHaveProperty('reaction')
        expect(body).not.toHaveProperty('completion')
    })
})

describe('GET /api/client/appointments/:appointmentId/attachments/:attachmentId', () => {
    it('returns own impression with completion=null when not completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'My impression',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.id).toBe(impression.id)
        expect(body).toHaveProperty('completion')
        expect(body.completion).toBeNull()
        expect(body).not.toHaveProperty('reaction')
    })

    it('returns own impression with populated completion when completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'My impression',
        })

        await AttachmentsService.completeImpression(impression.id, 'Reflected')

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.completion).toMatchObject({
            attachmentId: impression.id,
            clientResponse: 'Reflected',
        })
    })

    it('returns a psycho-authored recommendation with reaction=null when none', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: 'Rec text',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.id).toBe(recommendation.id)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toBeNull()
        expect(body).not.toHaveProperty('completion')
    })

    it('returns a recommendation with the populated reaction when one exists', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: 'Rec text',
        })

        await AttachmentsService.upsertReaction(recommendation.id, {
            done: false,
            comment: 'Will try',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.reaction).toMatchObject({
            attachmentId: recommendation.id,
            done: false,
            clientComment: 'Will try',
        })
    })

    it('returns 404 when attempting to fetch a note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
            text: 'Note text',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attempting to fetch an impression authored by a different client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client1 = await insertTestUser({ email: 'client1@test.com', activeRole: 'client' })
        const client2 = await insertTestUser({ email: 'client2@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client1.id, psycho.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client1.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Client1 impression',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client2.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 when Helpsycho-User-Role is psycho', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const res = await app.request(
            '/api/client/appointments/some-apt/attachments/some-attachment',
            await asUser(user.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request(
            '/api/client/appointments/some-apt/attachments/some-attachment',
            { method: 'GET', headers: { ...CLIENT_HEADER } },
        )

        expect(res.status).toBe(401)
    })
})

describe('GET /api/clients/:clientId/appointments/:appointmentId/attachments', () => {
    it('returns notes, impressions, recommendations grouped', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
            text: 'Note text',
        })
        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Impression text',
        })
        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: 'Rec text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = (await jsonBody(res)) as {
            notes: Array<{ id: string }>
            impressions: Array<{ id: string; completion: unknown }>
            recommendations: Array<{ id: string; reaction: unknown }>
        }
        expect(body.notes.map((n) => n.id)).toEqual([note.id])
        expect(body.impressions.map((i) => i.id)).toEqual([impression.id])
        expect(body.recommendations.map((r) => r.id)).toEqual([recommendation.id])
        expect(body.impressions[0]).toHaveProperty('completion')
        expect(body.impressions[0].completion).toBeNull()
        expect(body.recommendations[0]).toHaveProperty('reaction')
        expect(body.recommendations[0].reaction).toBeNull()
    })

    it('returns the full grouped envelope with all empty arrays when no attachments exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toEqual({ notes: [], impressions: [], recommendations: [] })
    })

    it('returns 200 with empty groups when the appointment is upcoming (status check not enforced)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toEqual({ notes: [], impressions: [], recommendations: [] })
    })

    it('returns reaction and completion populated when present', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Impression text',
        })
        await AttachmentsService.completeImpression(impression.id, 'Reflected')

        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: 'Rec text',
        })
        await AttachmentsService.upsertReaction(recommendation.id, {
            done: true,
            comment: 'Got it',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = (await jsonBody(res)) as {
            impressions: Array<{ completion: { clientResponse: string } | null }>
            recommendations: Array<{
                reaction: { done: boolean; clientComment: string | null } | null
            }>
        }
        expect(body.impressions[0].completion).toMatchObject({ clientResponse: 'Reflected' })
        expect(body.recommendations[0].reaction).toMatchObject({
            done: true,
            clientComment: 'Got it',
        })
    })

    it('excludes notes and recommendations authored by another psycho on the same appointment', async () => {
        // Edge case: only one psycho normally owns an appointment, but this defensively asserts
        // the per-type author rule in SQL. We attach a foreign-authored note/recommendation
        // by inserting via the service (bypassing route auth) and ensure they're filtered out.
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const otherPsycho = await insertTestUser({ email: 'other@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: otherPsycho.id,
            type: 'note',
            name: 'Foreign Note',
            text: null,
        })
        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: otherPsycho.id,
            type: 'recommendation',
            name: 'Foreign Rec',
            text: null,
        })
        const myNote = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Mine',
            text: null,
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = (await jsonBody(res)) as {
            notes: Array<{ id: string }>
            recommendations: Array<{ id: string }>
        }
        expect(body.notes.map((n) => n.id)).toEqual([myNote.id])
        expect(body.recommendations).toEqual([])
    })

    it('filters by ?type=note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
            text: null,
        })
        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Impression',
        })
        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: null,
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments?type=note`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = (await jsonBody(res)) as {
            notes: Array<{ id: string }>
            impressions: unknown[]
            recommendations: unknown[]
        }
        expect(body.notes.map((n) => n.id)).toEqual([note.id])
        expect(body.impressions).toEqual([])
        expect(body.recommendations).toEqual([])
    })

    it('returns 404 when the appointment is not owned by the requesting psycho', async () => {
        const psycho1 = await insertTestUser({ email: 'p1@test.com', activeRole: 'psycho' })
        const psycho2 = await insertTestUser({ email: 'p2@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'c@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho2.id)
        const apt = await createAppointment({
            psychoId: psycho2.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho1.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when :clientId URL param does not match the appointment client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        const otherClient = await insertTestUser({ email: 'other@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${otherClient.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 when Helpsycho-User-Role is client', async () => {
        const user = await insertTestUser({ activeRole: 'client' })
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments',
            await asUser(user.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )
        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments',
            { method: 'GET', headers: { ...PSYCHO_HEADER } },
        )
        expect(res.status).toBe(401)
    })
})

describe('GET /api/client/appointments/:appointmentId/attachments', () => {
    it('returns own impressions and all recommendations; no notes key omitted', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
            text: null,
        })
        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Mine',
        })
        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: 'Rec text',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = (await jsonBody(res)) as {
            impressions: Array<{ id: string }>
            recommendations: Array<{ id: string }>
            notes?: unknown
        }
        expect(body).not.toHaveProperty('notes')
        expect(body.impressions.map((i) => i.id)).toEqual([impression.id])
        expect(body.recommendations.map((r) => r.id)).toEqual([recommendation.id])
    })

    it('returns the full grouped envelope with all empty arrays when no attachments exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toEqual({ impressions: [], recommendations: [] })
    })

    it("excludes another client's impressions on the same appointment", async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client1 = await insertTestUser({ email: 'c1@test.com', activeRole: 'client' })
        const client2 = await insertTestUser({ email: 'c2@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client1.id, psycho.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client1.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Client1 impression',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client2.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        // client2 isn't on this appointment → 404 from ownership gate
        expect(res.status).toBe(404)
    })

    it('filters by ?type=recommendation', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Test impression',
            text: 'Mine',
        })
        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: null,
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments?type=recommendation`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = (await jsonBody(res)) as {
            impressions: unknown[]
            recommendations: Array<{ id: string }>
        }
        expect(body.impressions).toEqual([])
        expect(body.recommendations.map((r) => r.id)).toEqual([recommendation.id])
    })

    it('returns 400 when ?type=note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments?type=note`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 404 when appointment does not belong to the client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const owner = await insertTestUser({ email: 'owner@test.com', activeRole: 'client' })
        const stranger = await insertTestUser({ email: 'stranger@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(owner.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: owner.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(stranger.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 when Helpsycho-User-Role is psycho', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const res = await app.request(
            '/api/client/appointments/some-apt/attachments',
            await asUser(user.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )
        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request('/api/client/appointments/some-apt/attachments', {
            method: 'GET',
            headers: { ...CLIENT_HEADER },
        })
        expect(res.status).toBe(401)
    })
})

describe('POST /api/clients/:clientId/appointments/:appointmentId/attachments', () => {
    it('creates a note on an active appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'note', name: 'My Note', text: 'Body' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('attachment')
        expect(body.attachment).toMatchObject({
            type: 'note',
            name: 'My Note',
            text: 'Body',
            authorId: psycho.id,
            appointmentId: apt.id,
        })
    })

    it('creates a recommendation on a past appointment with image files', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const file = await insertTestFile(psycho.id, { originalName: 'photo.png' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    type: 'recommendation',
                    name: 'Read this',
                    imageFileIds: [file.id],
                }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await jsonBody(res)
        expect(body.attachment.type).toBe('recommendation')
        expect(body.attachment.imageFiles).toHaveLength(1)
        expect(body.attachment.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 400 AppointmentNotActive when the appointment is upcoming', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'note', name: 'X' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })

    it('returns 400 when name is missing', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'note' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 when type is impression (not allowed for psycho)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'impression', name: 'X' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 403 when referencing files owned by another user', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const otherUser = await insertTestUser({ email: 'other@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const foreignFile = await insertTestFile(otherUser.id, { originalName: 'foreign.png' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    type: 'note',
                    name: 'X',
                    imageFileIds: [foreignFile.id],
                }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 404 when the appointment does not belong to this psycho', async () => {
        const psycho1 = await insertTestUser({ email: 'p1@test.com', activeRole: 'psycho' })
        const psycho2 = await insertTestUser({ email: 'p2@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho2.id)
        const apt = await createAppointment({
            psychoId: psycho2.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho1.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'note', name: 'X' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser({ activeRole: 'client' })
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'note', name: 'X' }),
            }),
        )
        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'note', name: 'X' }),
            },
        )
        expect(res.status).toBe(401)
    })

    it('returns 400 AttachmentLimitReached when 15 notes already exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        for (let i = 0; i < 15; i++) {
            await AttachmentsService.create({
                appointmentId: apt.id,
                authorId: psycho.id,
                type: 'note',
                name: `Note ${i}`,
            })
        }

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'note', name: 'Sixteenth' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AttachmentLimitReached')
        expect(body).toMatchObject({ type: 'note', max: 15 })

        // recommendation still allowed (per-type limit)
        const recRes = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'recommendation', name: 'Rec' }),
            }),
        )
        expect(recRes.status).toBe(201)
    })

    it('returns 400 AttachmentLimitReached when 10 recommendations already exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)

        for (let i = 0; i < 10; i++) {
            await AttachmentsService.create({
                appointmentId: apt.id,
                authorId: psycho.id,
                type: 'recommendation',
                name: `Rec ${i}`,
            })
        }

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'recommendation', name: 'Eleventh' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AttachmentLimitReached')
        expect(body).toMatchObject({ type: 'recommendation', max: 10 })
    })
})

describe('POST /api/client/appointments/:appointmentId/attachments', () => {
    it('creates an impression on a past appointment with name and text', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({
                    type: 'impression',
                    name: 'Session 1',
                    text: 'My reflection',
                }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('attachment')
        expect(body.attachment).toMatchObject({
            type: 'impression',
            text: 'My reflection',
            name: 'Session 1',
            authorId: client.id,
            appointmentId: apt.id,
        })
    })

    it('creates an impression with name only (no text/images/audio)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'impression', name: 'Session 1' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await jsonBody(res)
        expect(body.attachment).toMatchObject({
            type: 'impression',
            name: 'Session 1',
            text: null,
        })
    })

    it('returns 400 AppointmentNotStarted when the appointment is upcoming', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'impression', name: 'X', text: 'x' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AppointmentNotStarted')
    })

    it('returns 400 when name is missing', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'impression', text: 'something' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 when type is not impression', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'note', name: 'X' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 403 when referencing files owned by another user', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const otherUser = await insertTestUser({ email: 'other@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const foreignFile = await insertTestFile(otherUser.id, { originalName: 'foreign.png' })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({
                    type: 'impression',
                    name: 'X',
                    text: 'x',
                    imageFileIds: [foreignFile.id],
                }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 404 when the appointment does not belong to the client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const owner = await insertTestUser({ email: 'owner@test.com', activeRole: 'client' })
        const stranger = await insertTestUser({ email: 'stranger@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(owner.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: owner.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(stranger.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'impression', name: 'X', text: 'x' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with psycho role header', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const res = await app.request(
            '/api/client/appointments/some-apt/attachments',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ type: 'impression', text: 'x' }),
            }),
        )
        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request('/api/client/appointments/some-apt/attachments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
            body: JSON.stringify({ type: 'impression', text: 'x' }),
        })
        expect(res.status).toBe(401)
    })

    it('returns 400 AttachmentLimitReached when 10 impressions already exist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        for (let i = 0; i < 10; i++) {
            await AttachmentsService.create({
                appointmentId: apt.id,
                authorId: client.id,
                type: 'impression',
                name: `Impression ${i}`,
            })
        }

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments`,
            await asUser(client.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ type: 'impression', name: 'Eleventh' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AttachmentLimitReached')
        expect(body).toMatchObject({ type: 'impression', max: 10 })
    })
})

// ─── DELETE — psycho view ─────────────────────────────────────────────────────

async function plantFileOnDisk(storedName: string): Promise<void> {
    await Bun.write(`./uploads/${storedName}`, new Uint8Array([1, 2, 3, 4]))
}

async function diskFileExists(storedName: string): Promise<boolean> {
    return Bun.file(`./uploads/${storedName}`).exists()
}

async function attachmentExists(id: string): Promise<boolean> {
    const [row] = await db`SELECT 1 AS one FROM attachments WHERE id = ${id}`
    return Boolean(row)
}

async function fileRowExists(id: string): Promise<boolean> {
    const [row] = await db`SELECT 1 AS one FROM files WHERE id = ${id}`
    return Boolean(row)
}

async function attachmentFilesCountFor(attachmentId: string): Promise<number> {
    const [row] = await db`
        SELECT COUNT(*)::int AS count FROM attachment_files WHERE attachment_id = ${attachmentId}
    `
    return Number(row.count)
}

describe('DELETE /api/clients/:clientId/appointments/:appointmentId/attachments/:attachmentId', () => {
    it('returns 204 deleting own note and removes the attachment row', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'To delete',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(note.id)).toBe(false)
    })

    it('returns 204 deleting own recommendation when no reaction exists', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const rec = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Read this',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${rec.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(rec.id)).toBe(false)
    })

    it('returns 404 for a non-existent attachmentId', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/00000000-0000-0000-0000-000000000000`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when the attachment belongs to a different appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const aptA = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(aptA.id)
        await endAppointment(aptA.id)

        const aptB = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(8),
            endTime: pastDate(8, 11),
        })
        await startAppointment(aptB.id)
        await endAppointment(aptB.id)

        const noteB = await AttachmentsService.create({
            appointmentId: aptB.id,
            authorId: psycho.id,
            type: 'note',
            name: 'B note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${aptA.id}/attachments/${noteB.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(noteB.id)).toBe(true)
    })

    it('returns 404 when the clientId in the URL does not own the appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const owner = await insertTestUser({ email: 'owner@test.com', activeRole: 'client' })
        const stranger = await insertTestUser({ email: 'stranger@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(owner.id, psycho.id)
        await ClientsService.linkClientToPsycho(stranger.id, psycho.id)

        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: owner.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'X',
        })

        const res = await app.request(
            `/api/clients/${stranger.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(note.id)).toBe(true)
    })

    it('returns 404 when the note was authored by a different psychologist', async () => {
        const psycho1 = await insertTestUser({ email: 'p1@test.com', activeRole: 'psycho' })
        const psycho2 = await insertTestUser({ email: 'p2@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho1.id)

        const apt = await createAppointment({
            psychoId: psycho1.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'note',
            name: 'Other psycho note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho1.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(note.id)).toBe(true)
    })

    it('returns 404 when attempting to delete an impression', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'My reflection',
            text: 'My reflection',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(impression.id)).toBe(true)
    })

    it('returns 409 RecommendationHasReaction when the recommendation has any reaction row', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const rec = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Reacted',
        })
        await AttachmentsService.upsertReaction(rec.id, { done: true })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${rec.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(409)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'RecommendationHasReaction')
        expect(await attachmentExists(rec.id)).toBe(true)
    })

    it('removes orphan files (db row + disk blob) when deleting a note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const file = await insertTestFile(psycho.id, { originalName: 'photo.png' })
        await plantFileOnDisk(file.storedName)
        expect(await diskFileExists(file.storedName)).toBe(true)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'With image',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(note.id)).toBe(false)
        expect(await attachmentFilesCountFor(note.id)).toBe(0)
        expect(await fileRowExists(file.id)).toBe(false)
        expect(await diskFileExists(file.storedName)).toBe(false)
    })

    it('preserves files referenced by another attachment_files row when deleting', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const sharedFile = await insertTestFile(psycho.id, { originalName: 'shared.png' })
        await plantFileOnDisk(sharedFile.storedName)

        const noteToDelete = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Delete me',
            imageFileIds: [sharedFile.id],
        })
        const otherNote = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Keep me',
            imageFileIds: [sharedFile.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${noteToDelete.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(noteToDelete.id)).toBe(false)
        expect(await attachmentExists(otherNote.id)).toBe(true)
        expect(await fileRowExists(sharedFile.id)).toBe(true)
        expect(await diskFileExists(sharedFile.storedName)).toBe(true)
        expect(await attachmentFilesCountFor(otherNote.id)).toBe(1)
    })

    it('preserves files referenced by an associative_images row when deleting', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const libraryFile = await insertTestFile(psycho.id, { originalName: 'library.png' })
        await plantFileOnDisk(libraryFile.storedName)
        await db`
            INSERT INTO associative_images (psychologist_id, name, file_id)
            VALUES (${psycho.id}, 'Library item', ${libraryFile.id})
        `

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Uses library image',
            imageFileIds: [libraryFile.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(psycho.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(note.id)).toBe(false)
        expect(await fileRowExists(libraryFile.id)).toBe(true)
        expect(await diskFileExists(libraryFile.storedName)).toBe(true)
    })

    it('returns 403 with the client role header', async () => {
        const user = await insertTestUser({ activeRole: 'client' })
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments/some-id',
            await asUser(user.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )
        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments/some-id',
            { method: 'DELETE', headers: { ...PSYCHO_HEADER } },
        )
        expect(res.status).toBe(401)
    })
})

// ─── DELETE — client view ─────────────────────────────────────────────────────

describe('DELETE /api/client/appointments/:appointmentId/attachments/:attachmentId', () => {
    it('returns 204 deleting own impression with no completion', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'My reflection',
            text: 'My reflection',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(impression.id)).toBe(false)
    })

    it('returns 404 for a non-existent attachmentId', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/00000000-0000-0000-0000-000000000000`,
            await asUser(client.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attempting to delete a recommendation', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const rec = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Read this',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${rec.id}`,
            await asUser(client.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(rec.id)).toBe(true)
    })

    it('returns 404 when attempting to delete a note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Private',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${note.id}`,
            await asUser(client.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(note.id)).toBe(true)
    })

    it('returns 404 when the impression was authored by a different client', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const owner = await insertTestUser({ email: 'owner@test.com', activeRole: 'client' })
        const stranger = await insertTestUser({ email: 'stranger@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(owner.id, psycho.id)
        await ClientsService.linkClientToPsycho(stranger.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: owner.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: owner.id,
            type: 'impression',
            name: 'Owner reflection',
            text: 'Owner reflection',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(stranger.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
        expect(await attachmentExists(impression.id)).toBe(true)
    })

    it('returns 409 ImpressionHasCompletion when the impression has a completion row', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'Reflection',
            text: 'Reflection',
        })
        await AttachmentsService.completeImpression(impression.id, 'Done.')

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(409)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'ImpressionHasCompletion')
        expect(await attachmentExists(impression.id)).toBe(true)
    })

    it('removes orphan files (db row + disk blob) when deleting an impression', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const file = await insertTestFile(client.id, { originalName: 'snapshot.png' })
        await plantFileOnDisk(file.storedName)

        const impression = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: 'with image',
            text: 'with image',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'DELETE', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(204)
        expect(await attachmentExists(impression.id)).toBe(false)
        expect(await fileRowExists(file.id)).toBe(false)
        expect(await diskFileExists(file.storedName)).toBe(false)
    })

    it('returns 403 with the psycho role header', async () => {
        const user = await insertTestUser({ activeRole: 'psycho' })
        const res = await app.request(
            '/api/client/appointments/some-apt/attachments/some-id',
            await asUser(user.id, { method: 'DELETE', headers: { ...PSYCHO_HEADER } }),
        )
        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request('/api/client/appointments/some-apt/attachments/some-id', {
            method: 'DELETE',
            headers: { ...CLIENT_HEADER },
        })
        expect(res.status).toBe(401)
    })
})
