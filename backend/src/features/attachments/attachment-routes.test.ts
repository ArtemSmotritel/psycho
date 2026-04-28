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
})
