import type { SQL } from 'bun'
import { db } from 'config/db'
import { log } from 'utils/logger'
import { emailService } from './email-service'
import type { EnqueueParams, OutboxContext } from './models'
import { SCHEDULED } from './producers'
import { NotificationsRepo } from './repo'
import { templates } from './templates'

const SENDER_BATCH = 50

/**
 * Decision tick (every 10 min): run each scheduled producer's candidate query and enqueue
 * a pending outbox row per candidate. The dedup index makes re-running a no-op.
 */
async function runDecisionTick(): Promise<void> {
    for (const producer of SCHEDULED) {
        for (const variant of producer.variants) {
            const candidates = await producer.find(variant)
            for (const candidate of candidates) {
                await NotificationsRepo.enqueue({
                    type: producer.type,
                    variant,
                    recipientUserId: candidate.recipientUserId,
                    appointmentId: candidate.appointmentId,
                })
            }
        }
    }
}

/** True if the row references an appointment that no longer renders a meaningful email. */
function isStale(ctx: OutboxContext): boolean {
    // Reminder types need a live, not-yet-started appointment. rec_created may stand alone.
    if (ctx.type === 'session_reminder' || ctx.type === 'rec_reminder') {
        if (!ctx.appointmentStartTime) return true
        if (ctx.appointmentStartedAt) return true
    }
    return false
}

/**
 * Sender tick (every 1 min): claim pending rows, re-fetch + re-validate context, render and
 * send. Send first, then record state. A transport failure is recorded, never thrown.
 */
async function runSenderTick(): Promise<void> {
    const pending = await NotificationsRepo.claimPending(SENDER_BATCH)
    for (const row of pending) {
        const ctx = await NotificationsRepo.findContext(row.id)
        if (!ctx) {
            // recipient or row vanished — nothing to send.
            await NotificationsRepo.markSkipped(row.id)
            continue
        }
        if (isStale(ctx)) {
            await NotificationsRepo.markSkipped(row.id)
            continue
        }
        try {
            const { subject, html, text } = templates[ctx.type](ctx)
            await emailService.send({ to: ctx.recipientEmail, subject, html, text })
            await NotificationsRepo.markSent(row.id)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            log.error(`[notifications] send failed for outbox ${row.id}`, message)
            await NotificationsRepo.markFailed(row.id, message)
        }
    }
}

/**
 * Transactional enqueue for a newly created recommendation. Called from within the
 * recommendation-insert transaction so the email can never be lost.
 */
async function enqueueRecCreated(
    params: { recipientUserId: string; appointmentId: string; attachmentId: string },
    executor: SQL = db,
): Promise<void> {
    const row: EnqueueParams = {
        type: 'rec_created',
        recipientUserId: params.recipientUserId,
        appointmentId: params.appointmentId,
        attachmentId: params.attachmentId,
        variant: null,
    }
    await NotificationsRepo.enqueue(row, executor)
}

export const NotificationsService = {
    runDecisionTick,
    runSenderTick,
    enqueueRecCreated,
} as const
