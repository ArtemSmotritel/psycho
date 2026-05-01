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
import { completeImpression, createAttachment, upsertReaction } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

describe('GET /api/clients/:clientId/appointments/:appointmentId/attachments/:attachmentId', () => {
    it('returns 200 with attachment for a note belonging to this psycho', async () => {
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
        const body = await res.json()
        expect(body).toHaveProperty('attachment')
        expect(body.attachment.id).toBe(note.id)
        expect(body.attachment.type).toBe('note')
    })

    it('returns 200 with attachment for a recommendation belonging to this psycho', async () => {
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

        const recommendation = await createAttachment({
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
        const body = await res.json()
        expect(body).toHaveProperty('attachment')
        expect(body.attachment.id).toBe(recommendation.id)
        expect(body.attachment.type).toBe('recommendation')
    })

    it('returns 200 with attachment for an impression authored by the client', async () => {
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
            name: null,
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
        const body = await res.json()
        expect(body).toHaveProperty('attachment')
        expect(body.attachment.id).toBe(impression.id)
        expect(body.attachment.type).toBe('impression')
        expect(body.attachment.authorId).toBe(client.id)
    })

    it('returns 404 when attachmentId does not exist', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/00000000-0000-0000-0000-000000000000`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachment belongs to a different appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
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

        const attachmentB = await createAttachment({
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
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho2.id)

        const apt = await createAppointment({
            psychoId: psycho2.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const attachment = await createAttachment({
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
        const user = await insertTestUser()

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
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await createAttachment({
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
        const body = await res.json()
        expect(body.attachment.id).toBe(recommendation.id)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toBeNull()
        expect(body).not.toHaveProperty('completion')
    })

    it('returns the reaction payload on a recommendation that has one', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation',
            text: 'Recommendation text',
        })

        await upsertReaction(recommendation.id, { done: true, comment: 'Got it' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.reaction).toMatchObject({
            attachmentId: recommendation.id,
            done: true,
            clientComment: 'Got it',
            psychologistReply: null,
        })
    })

    it('returns completion=null on an impression that has not been completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await createAttachment({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'Impression text',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.attachment.id).toBe(impression.id)
        expect(body).toHaveProperty('completion')
        expect(body.completion).toBeNull()
        expect(body).not.toHaveProperty('reaction')
    })

    it('returns the completion payload on an impression that has been completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await createAttachment({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'Impression text',
        })

        await completeImpression(impression.id, 'Reflected on it')

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(psycho.id, { method: 'GET', headers: { ...PSYCHO_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.completion).toMatchObject({
            attachmentId: impression.id,
            clientResponse: 'Reflected on it',
        })
        expect(body.completion.createdAt).toBeTruthy()
    })

    it('omits both reaction and completion on a note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await createAttachment({
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
        const body = await res.json()
        expect(body.attachment.id).toBe(note.id)
        expect(body).not.toHaveProperty('reaction')
        expect(body).not.toHaveProperty('completion')
    })
})

describe('GET /api/client/appointments/:appointmentId/attachments/:attachmentId', () => {
    it("returns own impression with completion=null when not completed", async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await createAttachment({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'My impression',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.attachment.id).toBe(impression.id)
        expect(body).toHaveProperty('completion')
        expect(body.completion).toBeNull()
        expect(body).not.toHaveProperty('reaction')
    })

    it('returns own impression with populated completion when completed', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const impression = await createAttachment({
            appointmentId: apt.id,
            authorId: client.id,
            type: 'impression',
            name: null,
            text: 'My impression',
        })

        await completeImpression(impression.id, 'Reflected')

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.completion).toMatchObject({
            attachmentId: impression.id,
            clientResponse: 'Reflected',
        })
    })

    it('returns a psycho-authored recommendation with reaction=null when none', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await createAttachment({
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
        const body = await res.json()
        expect(body.attachment.id).toBe(recommendation.id)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toBeNull()
        expect(body).not.toHaveProperty('completion')
    })

    it('returns a recommendation with the populated reaction when one exists', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            text: 'Rec text',
        })

        await upsertReaction(recommendation.id, { done: false, comment: 'Will try' })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(client.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.reaction).toMatchObject({
            attachmentId: recommendation.id,
            done: false,
            clientComment: 'Will try',
        })
    })

    it('returns 404 when attempting to fetch a note', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: pastDate(7),
            endTime: pastDate(7, 11),
        })
        await startAppointment(apt.id)
        await endAppointment(apt.id)

        const note = await createAttachment({
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
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })
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

        const impression = await createAttachment({
            appointmentId: apt.id,
            authorId: client1.id,
            type: 'impression',
            name: null,
            text: 'Client1 impression',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/attachments/${impression.id}`,
            await asUser(client2.id, { method: 'GET', headers: { ...CLIENT_HEADER } }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 when Helpsycho-User-Role is psycho', async () => {
        const user = await insertTestUser()
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
