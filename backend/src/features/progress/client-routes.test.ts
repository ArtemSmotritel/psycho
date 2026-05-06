import { describe, expect, it } from 'bun:test'
import { app } from 'config/app'
import { jsonBody } from '../../test-fixtures/responses'
import { asUser, insertTestUser } from '../../test-fixtures/users'
import { futureDate } from '../../test-fixtures/dates'
import { ClientsService } from '../clients/services'
import {
    createAppointment,
    startAppointment,
    endAppointment,
} from '../../test-fixtures/appointments'
import { AttachmentsService } from '../attachments/services'

const PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }
const CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }

// ─── GET /api/client/progress/psychologists ──────────────────────────────────

describe('GET /api/client/progress/psychologists', () => {
    it('returns only linked, non-disconnected psychologists', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })
        const psycho1 = await insertTestUser({ email: 'psycho1@test.com' })
        const psycho2 = await insertTestUser({ email: 'psycho2@test.com' })
        const unlinkedPsycho = await insertTestUser({ email: 'unlinked@test.com' })

        await ClientsService.linkClientToPsycho(client.id, psycho1.id)
        await ClientsService.linkClientToPsycho(client.id, psycho2.id)
        // unlinkedPsycho intentionally not linked

        const res = await app.request(
            '/api/client/progress/psychologists',
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('psychologists')
        expect(body.psychologists).toHaveLength(2)
        const ids = body.psychologists.map((p: { id: string }) => p.id).sort()
        expect(ids).toEqual([psycho1.id, psycho2.id].sort())
        expect(ids).not.toContain(unlinkedPsycho.id)
    })

    it('returns empty array when client has no psychologists', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })

        const res = await app.request(
            '/api/client/progress/psychologists',
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.psychologists).toHaveLength(0)
    })

    it('returns 403 when Helpsycho-User-Role is psycho', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/progress/psychologists',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request('/api/client/progress/psychologists', {
            method: 'GET',
            headers: { ...CLIENT_HEADER },
        })

        expect(res.status).toBe(401)
    })
})

// ─── GET /api/client/progress/:psychoId ──────────────────────────────────────

describe('GET /api/client/progress/:psychoId', () => {
    it('happy path — returns sessions with impressions and recommendations ordered by startTime ASC', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)

        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(14),
            endTime: futureDate(14, 11),
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        await AttachmentsService.create({
            appointmentId: apt1.id,
            authorId: client.id,
            type: 'impression',
            name: 'First session impression',
            text: 'First session impression',
        })
        const rec1 = await AttachmentsService.create({
            appointmentId: apt1.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Breathing exercise',
            text: 'Practice 5 min/day',
        })
        await AttachmentsService.upsertReaction(rec1.id, {
            done: true,
            comment: 'Tried it, helpful',
        })
        await AttachmentsService.create({
            appointmentId: apt2.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Journaling',
            text: 'Write 3 things daily',
        })

        const res = await app.request(
            `/api/client/progress/${psycho.id}`,
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('sessions')
        expect(body.sessions).toHaveLength(2)

        // chronological order
        expect(body.sessions[0].id).toBe(apt1.id)
        expect(body.sessions[1].id).toBe(apt2.id)

        // session 1: one impression + one recommendation with reaction
        expect(body.sessions[0].impressions).toHaveLength(1)
        expect(body.sessions[0].impressions[0].text).toBe('First session impression')
        expect(body.sessions[0].recommendations).toHaveLength(1)
        expect(body.sessions[0].recommendations[0].name).toBe('Breathing exercise')
        expect(body.sessions[0].recommendations[0].reaction).not.toBeNull()
        expect(body.sessions[0].recommendations[0].reaction.done).toBe(true)
        expect(body.sessions[0].recommendations[0].reaction.clientComment).toBe('Tried it, helpful')

        // session 2: zero impressions + one recommendation with null reaction
        expect(body.sessions[1].impressions).toHaveLength(0)
        expect(body.sessions[1].recommendations).toHaveLength(1)
        expect(body.sessions[1].recommendations[0].reaction).toBeNull()

        // each session includes metadata
        expect(body.sessions[0]).toHaveProperty('startTime')
        expect(body.sessions[0]).toHaveProperty('endTime')
        expect(body.sessions[0]).toHaveProperty('status')
    })

    it('excludes upcoming appointments', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client = await insertTestUser({ email: 'client@test.com' })
        await ClientsService.linkClientToPsycho(client.id, psycho.id)

        // past (active → past)
        const pastApt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(1),
            endTime: futureDate(1, 11),
        })
        await startAppointment(pastApt.id)
        await endAppointment(pastApt.id)

        // upcoming (never started)
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: futureDate(30),
            endTime: futureDate(30, 11),
        })

        const res = await app.request(
            `/api/client/progress/${psycho.id}`,
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.sessions).toHaveLength(1)
        expect(body.sessions[0].id).toBe(pastApt.id)
    })

    it('returns 400 PsychoNotLinked when psycho is not linked to this client', async () => {
        const client = await insertTestUser({ email: 'client@test.com' })
        const otherPsycho = await insertTestUser({ email: 'other@test.com' })

        const res = await app.request(
            `/api/client/progress/${otherPsycho.id}`,
            await asUser(client.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(400)
        const body = await jsonBody(res)
        expect(body).toHaveProperty('error', 'PsychoNotLinked')
    })

    it('IDOR — sessions from other client-psycho pairs do not appear', async () => {
        const psycho = await insertTestUser({ email: 'psycho@test.com' })
        const client1 = await insertTestUser({ email: 'client1@test.com' })
        const client2 = await insertTestUser({ email: 'client2@test.com' })

        await ClientsService.linkClientToPsycho(client1.id, psycho.id)
        await ClientsService.linkClientToPsycho(client2.id, psycho.id)

        const apt1 = await createAppointment({
            psychoId: psycho.id,
            clientId: client1.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt1.id)
        await endAppointment(apt1.id)

        const apt2 = await createAppointment({
            psychoId: psycho.id,
            clientId: client2.id,
            startTime: futureDate(7),
            endTime: futureDate(7, 11),
        })
        await startAppointment(apt2.id)
        await endAppointment(apt2.id)

        await AttachmentsService.create({
            appointmentId: apt1.id,
            authorId: client1.id,
            type: 'impression',
            name: 'Client1 impression',
            text: 'Client1 impression',
        })
        await AttachmentsService.create({
            appointmentId: apt2.id,
            authorId: client2.id,
            type: 'impression',
            name: 'Client2 impression',
            text: 'Client2 impression — should NOT appear',
        })

        const res = await app.request(
            `/api/client/progress/${psycho.id}`,
            await asUser(client1.id, {
                method: 'GET',
                headers: { ...CLIENT_HEADER },
            }),
        )

        expect(res.status).toBe(200)
        const body = await jsonBody(res)
        expect(body.sessions).toHaveLength(1)
        expect(body.sessions[0].id).toBe(apt1.id)
        expect(body.sessions[0].impressions).toHaveLength(1)
        expect(body.sessions[0].impressions[0].text).toBe('Client1 impression')
    })

    it('returns 403 when Helpsycho-User-Role is psycho', async () => {
        const user = await insertTestUser()

        const res = await app.request(
            '/api/client/progress/some-psycho',
            await asUser(user.id, {
                method: 'GET',
                headers: { ...PSYCHO_HEADER },
            }),
        )

        expect(res.status).toBe(403)
    })

    it('returns 401 when unauthenticated', async () => {
        const res = await app.request('/api/client/progress/some-psycho', {
            method: 'GET',
            headers: { ...CLIENT_HEADER },
        })

        expect(res.status).toBe(401)
    })
})
