import { describe, expect, it, spyOn } from 'bun:test'
import { testDb } from '../../test-fixtures/db'
import { insertTestUser } from '../../test-fixtures/users'
import { createAppointment } from '../../test-fixtures/appointments'
import { ClientsService } from '../clients/services'
import { AttachmentsService } from '../attachments/services'
import { AttachmentsRepo } from '../attachments/repo'
import { emailService } from './email-service'
import { NotificationsService } from './services'

/** ISO string `ms` milliseconds from now. */
const fromNow = (ms: number) => new Date(Date.now() + ms).toISOString()
const HOUR = 60 * 60 * 1000

interface OutboxRecord {
    type: string
    variant: string | null
    recipient_user_id: string
    appointment_id: string | null
    attachment_id: string | null
    status: string
    attempts: number
}

const outbox = (): Promise<OutboxRecord[]> =>
    testDb`SELECT * FROM email_outbox ORDER BY type, variant, recipient_user_id` as Promise<
        OutboxRecord[]
    >

async function linkedPair() {
    const psycho = await insertTestUser({ email: 'psycho@test.com', activeRole: 'psycho' })
    const client = await insertTestUser({ email: 'client@test.com', activeRole: 'client' })
    await ClientsService.linkClientToPsycho(client.id, psycho.id)
    return { psycho, client }
}

describe('NotificationsService.runDecisionTick — session reminders', () => {
    it('enqueues one pending row per recipient for an appointment inside the 24h band', async () => {
        const { psycho, client } = await linkedPair()
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(12 * HOUR),
            endTime: fromNow(13 * HOUR),
        })

        await NotificationsService.runDecisionTick()

        const rows = await outbox()
        expect(rows).toHaveLength(2)
        expect(rows.every((r) => r.type === 'session_reminder' && r.variant === '24h')).toBe(true)
        expect(rows.every((r) => r.status === 'pending')).toBe(true)
        expect(new Set(rows.map((r) => r.recipient_user_id))).toEqual(
            new Set([psycho.id, client.id]),
        )
    })

    it('is idempotent — re-running produces no duplicates', async () => {
        const { psycho, client } = await linkedPair()
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(12 * HOUR),
            endTime: fromNow(13 * HOUR),
        })

        await NotificationsService.runDecisionTick()
        await NotificationsService.runDecisionTick()

        expect(await outbox()).toHaveLength(2)
    })

    it('banding — an appointment less than 1h out yields only the 1h variant', async () => {
        const { psycho, client } = await linkedPair()
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(0.5 * HOUR),
            endTime: fromNow(1.5 * HOUR),
        })

        await NotificationsService.runDecisionTick()

        const rows = await outbox()
        expect(rows).toHaveLength(2)
        expect(rows.every((r) => r.variant === '1h')).toBe(true)
    })

    it('does not enqueue for an already-started appointment', async () => {
        const { psycho, client } = await linkedPair()
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(12 * HOUR),
            endTime: fromNow(13 * HOUR),
        })
        await testDb`UPDATE appointments SET started_at = NOW() WHERE id = ${apt.id}`

        await NotificationsService.runDecisionTick()

        const rows = (await outbox()).filter((r) => r.type === 'session_reminder')
        expect(rows).toHaveLength(0)
    })
})

describe('NotificationsService.runDecisionTick — rec reminders', () => {
    async function scenarioWithRecommendation() {
        const { psycho, client } = await linkedPair()
        // Prior (past) appointment carrying a recommendation.
        const prior = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(-48 * HOUR),
            endTime: fromNow(-47 * HOUR),
        })
        const rec = await AttachmentsService.create({
            appointmentId: prior.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Homework',
            text: 'Do the exercise',
        })
        // Upcoming appointment inside the 2d band.
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(36 * HOUR),
            endTime: fromNow(37 * HOUR),
        })
        return { psycho, client, rec }
    }

    it('enqueues one rec_reminder for the client when an undone recommendation exists', async () => {
        const { client } = await scenarioWithRecommendation()

        await NotificationsService.runDecisionTick()

        const rows = (await outbox()).filter((r) => r.type === 'rec_reminder')
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            variant: '2d',
            recipient_user_id: client.id,
            status: 'pending',
        })
    })

    it('enqueues no rec_reminder once the recommendation is marked done', async () => {
        const { rec } = await scenarioWithRecommendation()
        await AttachmentsRepo.upsertReaction(rec.id, { done: true })

        await NotificationsService.runDecisionTick()

        const rows = (await outbox()).filter((r) => r.type === 'rec_reminder')
        expect(rows).toHaveLength(0)
    })
})

describe('rec_created transactional hook', () => {
    it('enqueues a rec_created row in the same committed transaction as the recommendation', async () => {
        const { psycho, client } = await linkedPair()
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(-2 * HOUR),
            endTime: fromNow(-1 * HOUR),
        })

        const rec = await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'recommendation',
            name: 'Homework',
            text: 'Do the exercise',
        })

        const rows = (await outbox()).filter((r) => r.type === 'rec_created')
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            recipient_user_id: client.id,
            appointment_id: apt.id,
            attachment_id: rec.id,
            variant: null,
            status: 'pending',
        })
    })

    it('does not enqueue for non-recommendation attachments', async () => {
        const { psycho, client } = await linkedPair()
        const apt = await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(-2 * HOUR),
            endTime: fromNow(-1 * HOUR),
        })

        await AttachmentsService.create({
            appointmentId: apt.id,
            authorId: psycho.id,
            type: 'note',
            name: 'Session note',
            text: 'Notes',
        })

        expect(await outbox()).toHaveLength(0)
    })
})

describe('NotificationsService.runSenderTick', () => {
    it('marks pending rows as sent (transport logs in test)', async () => {
        const { psycho, client } = await linkedPair()
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(12 * HOUR),
            endTime: fromNow(13 * HOUR),
        })
        await NotificationsService.runDecisionTick()

        await NotificationsService.runSenderTick()

        const rows = await outbox()
        expect(rows).toHaveLength(2)
        expect(rows.every((r) => r.status === 'sent')).toBe(true)
    })

    it('increments attempts on transport failure and fails after 3 attempts', async () => {
        const { psycho, client } = await linkedPair()
        await createAppointment({
            psychoId: psycho.id,
            clientId: client.id,
            startTime: fromNow(0.5 * HOUR),
            endTime: fromNow(1.5 * HOUR),
        })
        await NotificationsService.runDecisionTick()

        const spy = spyOn(emailService, 'send').mockRejectedValue(new Error('boom'))
        try {
            await NotificationsService.runSenderTick()
            let rows = await outbox()
            expect(rows.every((r) => r.attempts === 1 && r.status === 'pending')).toBe(true)

            await NotificationsService.runSenderTick()
            await NotificationsService.runSenderTick()
            rows = await outbox()
            expect(rows.every((r) => r.attempts === 3 && r.status === 'failed')).toBe(true)

            // No longer claimed once failed.
            await NotificationsService.runSenderTick()
            rows = await outbox()
            expect(rows.every((r) => r.attempts === 3)).toBe(true)
        } finally {
            spy.mockRestore()
        }
    })
})
