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
import { createAttachment } from './services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── PATCH /api/client/appointments/:appointmentId/recommendations/:attachmentId/reaction ──

describe('PATCH /api/client/appointments/:appointmentId/recommendations/:attachmentId/reaction', () => {
    it('returns 200 with done: true when toggling done', async () => {
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
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ done: true }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toHaveProperty('done', true)
        expect(body.reaction).toHaveProperty('attachmentId', recommendation.id)
    })

    it('returns 200 with clientComment set when submitting comment', async () => {
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
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ comment: 'Great advice!' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toHaveProperty('clientComment', 'Great advice!')
    })

    it('preserves existing comment when toggling done a second time', async () => {
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
            name: 'My Recommendation',
        })

        // First: set comment
        await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ comment: 'Original comment' }),
            }),
        )

        // Second: toggle done only
        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ done: true }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.reaction).toHaveProperty('clientComment', 'Original comment')
        expect(body.reaction).toHaveProperty('done', true)
    })

    it('returns 400 CommentAlreadySet on second comment attempt', async () => {
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
            name: 'My Recommendation',
        })

        await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ comment: 'First comment' }),
            }),
        )

        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ comment: 'Second comment' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'CommentAlreadySet')
    })

    it('returns 400 BadRequest when neither done nor comment is provided', async () => {
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
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'BadRequest')
    })

    it('returns 404 when appointmentId does not belong to this client', async () => {
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
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(otherClient.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ done: true }),
            }),
        )

        expect(res.status).toBe(404)
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

        const recommendation = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation on apt2',
        })

        const res = await app.request(
            `/api/client/appointments/${apt1.id}/recommendations/${recommendation.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ done: true }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachmentId has type !== recommendation (e.g. a note)', async () => {
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
            name: 'A Note',
        })

        const res = await app.request(
            `/api/client/appointments/${apt.id}/recommendations/${note.id}/reaction`,
            await asUser(client.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ done: true }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with psycho role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/appointments/some-apt/recommendations/some-id/reaction',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ done: true }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request(
            '/api/client/appointments/some-apt/recommendations/some-id/reaction',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ done: true }),
            },
        )

        expect(res.status).toBe(401)
    })
})

// ─── PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId/reply ──

describe('PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId/reply', () => {
    it('returns 200 with psychologistReply set', async () => {
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
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Keep it up!' }),
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('reaction')
        expect(body.reaction).toHaveProperty('psychologistReply', 'Keep it up!')
        expect(body.reaction).toHaveProperty('attachmentId', recommendation.id)
    })

    it('returns 400 ReplyAlreadySet on second reply attempt', async () => {
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
            name: 'My Recommendation',
        })

        await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'First reply' }),
            }),
        )

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Second reply' }),
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'ReplyAlreadySet')
    })

    it('returns 400 BadRequest when reply is absent', async () => {
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
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({}),
            }),
        )

        expect(res.status).toBe(400)
    })

    it('returns 400 BadRequest when reply is empty string', async () => {
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
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: '' }),
            }),
        )

        expect(res.status).toBe(400)
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
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'recommendation',
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when clientId URL param does not match the appointment actual client', async () => {
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
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'My Recommendation',
        })

        const res = await app.request(
            `/api/clients/${otherClient.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            }),
        )

        expect(res.status).toBe(404)
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

        const recommendation = await createAttachment({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Recommendation on apt2',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt1.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when attachmentId has type !== recommendation', async () => {
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
            name: 'A Note',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${note.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 404 when recommendation was authored by a different psychologist', async () => {
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
        const recommendation = await createAttachment({
            appointmentId: apt.id,
            authorId: psycho2.id,
            type: 'recommendation',
            name: 'Other psycho recommendation',
        })

        const res = await app.request(
            `/api/clients/${client.id}/appointments/${apt.id}/recommendations/${recommendation.id}/reply`,
            await asUser(psycho.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            }),
        )

        expect(res.status).toBe(404)
    })

    it('returns 403 with client role header', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations/some-id/reply',
            await asUser(user.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...CLIENT_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 unauthenticated', async () => {
        const res = await app.request(
            '/api/clients/some-client/appointments/some-apt/recommendations/some-id/reply',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...PSYCHO_HEADER },
                body: JSON.stringify({ reply: 'Hello' }),
            },
        )

        expect(res.status).toBe(401)
    })
})
