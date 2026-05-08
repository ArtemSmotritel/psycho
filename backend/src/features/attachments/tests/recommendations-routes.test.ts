import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { jsonBody } from '../../../test-fixtures/responses'
import { asUser, insertTestUser } from '../../../test-fixtures/users'
import { insertTestFile } from '../../../test-fixtures/files'
import { futureDate } from '../../../test-fixtures/dates'
import { ClientsService } from '../../clients/services'
import {
    createAppointment,
    startAppointment,
    endAppointment,
} from '../../../test-fixtures/appointments'
import { AttachmentsService } from '../services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── PATCH /api/clients/:clientId/appointments/:appointmentId/attachments/:attachmentId (recommendation) ──

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/attachments/:attachmentId (recommendation)', () => {
    it('returns 200 with updated name/text; imageFileIds in body is ignored (unchanged in response)', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'original.png' })
        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Original Name',
            text: 'Original Text',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
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
        const body = await jsonBody(res)
        expect(body).toHaveProperty('attachment')
        expect(body.attachment).toHaveProperty('name', 'Updated Name')
        expect(body.attachment).toHaveProperty('text', 'Updated Text')
        // imageFiles should NOT be changed (locked after creation)
        expect(body.attachment.imageFiles).toHaveLength(1)
        expect(body.attachment.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 404 when attachmentId belongs to a different appointment', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
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

        const recommendation = await AttachmentsService.create({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation on apt2',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when recommendation was created by a different psychologist', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com', activeRole: 'psycho' })
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
            authorId: psycho2.id,
            type: 'recommendation',
            name: 'Other psycho recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 400 AppointmentNotActive when upcoming', async () => {
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
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/some-id`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'AppointmentNotActive')
    })

    it('happy path — removeFileIds removes linked files from the recommendation', async () => {
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

        const file1 = await insertTestFile(psycho.id, { originalName: 'img1.png' })
        const file2 = await insertTestFile(psycho.id, { originalName: 'img2.png' })
        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec with files',
            imageFileIds: [file1.id, file2.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Rec with files', removeFileIds: [file1.id] }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.imageFiles).toHaveLength(1)
        expect(body.attachment.imageFiles[0]).toHaveProperty('id', file2.id)
    })

    it('removeFileIds with non-existent ids does not fail', async () => {
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

        const file = await insertTestFile(psycho.id, { originalName: 'img.png' })
        const recommendation = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Rec',
            imageFileIds: [file.id],
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/attachments/${recommendation.id}`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ name: 'Rec', removeFileIds: ['non-existent-id'] }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.attachment.imageFiles).toHaveLength(1)
        expect(body.attachment.imageFiles[0]).toHaveProperty('id', file.id)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser({ activeRole: 'client' })

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/attachments/some-id',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ name: 'Updated' }),
            }),
        )

        expect(res.status).toBe(403)
    })
})
