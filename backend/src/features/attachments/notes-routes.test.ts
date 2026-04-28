import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { insertTestFile } from '../../test-fixtures/files'
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

// ─── GET / ───────────────────────────────────────────────────────────────────

describe('GET /api/clients/:clientId/appointments/:appointmentId/notes', () => {
    it('returns only this psycho notes on happy path (past appointment)', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
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

        // Create a note by psycho (should be visible)
        await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Psycho Note',
        })
        // Create a note by psycho2 on the same appointment (should NOT be visible)
        await createAttachment({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'note',
            name: 'Other Psycho Note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('notes')
        expect(body.notes).toHaveLength(1)
        expect(body.notes[0]).toHaveProperty('name', 'Psycho Note')
        expect(body.notes[0]).toHaveProperty('authorId', psycho.id)
    })

    it('returns { notes: [] } when no notes exist', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('notes')
        expect(body.notes).toHaveLength(0)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/notes',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt/notes', {
            method: 'GET',
            headers: { ...PSYCHO_HEADER },
        })

        expect(res.status).toBe(401)
    })

    it('returns 404 when appointmentId does not belong to this psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
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

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when clientId URL param does not match appointment client', async () => {
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
        await endAppointment(apt.id)

        const res = await app.request(
            `/api/clients/${otherClient.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 400 AppointmentNotActive when upcoming', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })
})

// ─── POST / ──────────────────────────────────────────────────────────────────

describe('POST /api/clients/:clientId/appointments/:appointmentId/notes', () => {
    it('happy path — active appointment, creates note with name', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'My Note', text: 'Note content' }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toHaveProperty('note')
        expect(body.note).toHaveProperty('name', 'My Note')
        expect(body.note).toHaveProperty('text', 'Note content')
        expect(body.note).toHaveProperty('type', 'note')
        expect(body.note).toHaveProperty('authorId', psycho.id)
        expect(body.note).toHaveProperty('appointmentId', apt.id)
    })

    it('happy path — past appointment, creates note with imageFileIds', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'photo.png' })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({
                    name: 'Image Note',
                    imageFileIds: [file.id],
                }),
            }),
        )

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.note).toHaveProperty('name', 'Image Note')
        expect(body.note.imageFiles).toHaveLength(1)
        expect(body.note.imageFiles[0]).toHaveProperty('id', file.id)
        expect(body.note.imageFiles[0]).toHaveProperty('url', `/api/files/${file.storedName}`)
    })

    it('returns 400 BadRequest when name is missing', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ text: 'No name' }),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 AppointmentNotActive when upcoming', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Note' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/notes',
            await asUser(user.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ name: 'Note' }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request('/api/clients/some-client/appointments/some-apt/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
            body: JSON.stringify({ name: 'Note' }),
        })

        expect(res.status).toBe(401)
    })

    it('returns 404 when appointment does not belong to this psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
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

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes`,
            await asUser(psycho.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Note' }),
            }),
        )

        expect(res.status).toBe(404)
    })
})

// ─── GET /:attachmentId ───────────────────────────────────────────────────────

describe('GET /api/clients/:clientId/appointments/:appointmentId/notes/:attachmentId', () => {
    it('happy path — returns { note: Attachment }', async () => {
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
            name: 'Get Note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toHaveProperty('note')
        expect(body.note).toHaveProperty('id', note.id)
        expect(body.note).toHaveProperty('name', 'Get Note')
    })

    it('returns 404 when attachmentId belongs to a different appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        const note = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note on apt2',
        })

        // Request via apt1 URL but note belongs to apt2
        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachmentId has type !== note', async () => {
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
            authorId: psycho.id,
            type: 'impression',
            name: 'An Impression',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${impression.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when note was created by a different psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
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
            authorId: psycho2.id,
            type: 'note',
            name: 'Other psycho note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 400 AppointmentNotActive when upcoming', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/notes/some-id`,
            await asUser(psycho.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/notes/some-id',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/notes/some-id',
            {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            },
        )

        expect(res.status).toBe(401)
    })
})

// ─── PATCH /:attachmentId ─────────────────────────────────────────────────────

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/notes/:attachmentId', () => {
    it('happy path — updates name and text; imageFileIds in body does not change stored imageFiles', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'original.png' })
        const note = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Original Name',
            text: 'Original Text',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
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
        expect(body).toHaveProperty('note')
        expect(body.note).toHaveProperty('name', 'Updated Name')
        expect(body.note).toHaveProperty('text', 'Updated Text')
        // imageFiles should NOT be changed (locked after creation)
        expect(body.note.imageFiles).toHaveLength(1)
        expect(body.note.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 404 when attachmentId belongs to a different appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        const note = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachmentId has type !== note (e.g. recommendation)', async () => {
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
            name: 'A Recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when note was created by a different psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
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
            authorId: psycho2.id,
            type: 'note',
            name: 'Other psycho note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
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
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/some-id`,
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

    it('happy path — removeFileIds removes linked files from the note', async () => {
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

        const file1 = await insertTestFile(psycho.id, { originalName: 'img1.png' })
        const file2 = await insertTestFile(psycho.id, { originalName: 'img2.png' })
        const note = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note with files',
            imageFileIds: [file1.id, file2.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ removeFileIds: [file1.id] }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.note.imageFiles).toHaveLength(1)
        expect(body.note.imageFiles[0]).toHaveProperty('id', file2.id)
    })

    it('removeFileIds with non-existent ids does not fail', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'img.png' })
        const note = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ removeFileIds: ['non-existent-id'] }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.note.imageFiles).toHaveLength(1)
        expect(body.note.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/notes/some-id',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})

// ─── DELETE /:attachmentId ────────────────────────────────────────────────────

describe('DELETE /api/clients/:clientId/appointments/:appointmentId/notes/:attachmentId', () => {
    it('happy path — deletes note, returns { success: true }', async () => {
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
            name: 'To Delete',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
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
        await ClientsService.linkClientToPsycho(client.id, psycho.id)
        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(8),
            endTime: futureDate(8, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        const note = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Note on apt2',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/notes/${note.id}`,
            await asUser(psycho.id, {
                method: 'DELETE',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when note was created by a different psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
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
            authorId: psycho2.id,
            type: 'note',
            name: 'Other psycho note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/notes/${note.id}`,
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
            '/api/clients/some-client/appointments/some-apt/notes/some-id',
            await asUser(user.id, {
                method: 'DELETE',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })
})
