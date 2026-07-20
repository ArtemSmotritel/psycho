import type { SQL } from 'bun'
import { db } from 'config/db'
import type {
    AppointmentEmailContext,
    EnqueueParams,
    InvitationEmailContext,
    OutboxRow,
    Variant,
} from './models'

const MAX_ATTEMPTS = 3

const OUTBOX_COLUMNS = `
    id,
    type,
    variant,
    recipient_user_id AS "recipientUserId",
    recipient_email AS "recipientEmail",
    appointment_id AS "appointmentId",
    attachment_id AS "attachmentId",
    invitation_id AS "invitationId",
    status,
    attempts,
    last_error AS "lastError",
    scheduled_for AS "scheduledFor",
    created_at AS "createdAt",
    sent_at AS "sentAt"
`

/** A bare (appointment, recipient) candidate pair produced by a banding query. */
export interface ReminderCandidate {
    appointmentId: string
    recipientUserId: string
}

function sessionBand(executor: SQL, variant: Variant) {
    // Each variant fires only within its own band so an appointment booked inside a
    // more-urgent window doesn't also trigger the wider one.
    if (variant === '1h') {
        return executor`a.start_time <= NOW() + INTERVAL '1 hour' AND a.start_time > NOW()`
    }
    return executor`a.start_time <= NOW() + INTERVAL '24 hours' AND a.start_time > NOW() + INTERVAL '1 hour'`
}

function recBand(executor: SQL, variant: Variant) {
    if (variant === '1d') {
        return executor`a.start_time <= NOW() + INTERVAL '1 day' AND a.start_time > NOW()`
    }
    return executor`a.start_time <= NOW() + INTERVAL '2 days' AND a.start_time > NOW() + INTERVAL '1 day'`
}

export const NotificationsRepo = {
    async enqueue(params: EnqueueParams, executor: SQL = db): Promise<void> {
        await executor`
            INSERT INTO email_outbox (type, variant, recipient_user_id, recipient_email, appointment_id, attachment_id, invitation_id, scheduled_for)
            VALUES (
                ${params.type},
                ${params.variant ?? null},
                ${params.recipientUserId ?? null},
                ${params.recipientEmail ?? null},
                ${params.appointmentId ?? null},
                ${params.attachmentId ?? null},
                ${params.invitationId ?? null},
                COALESCE(${params.scheduledFor ?? null}, NOW())
            )
            ON CONFLICT DO NOTHING
        `
    },

    async claimPending(limit: number, executor: SQL = db): Promise<OutboxRow[]> {
        const rows = await executor`
            SELECT ${db.unsafe(OUTBOX_COLUMNS)}
            FROM email_outbox
            WHERE status = 'pending'
              AND scheduled_for <= NOW()
              AND attempts < ${MAX_ATTEMPTS}
            ORDER BY created_at
            LIMIT ${limit}
        `
        return rows as OutboxRow[]
    },

    async findAppointmentContext(
        id: string,
        executor: SQL = db,
    ): Promise<AppointmentEmailContext | null> {
        const [row] = await executor`
            SELECT
                o.id,
                o.type,
                o.variant,
                u.email AS "recipientEmail",
                u.name AS "recipientName",
                CASE WHEN a.psycho_id = o.recipient_user_id THEN 'psycho' ELSE 'client' END AS "recipientRole",
                o.appointment_id AS "appointmentId",
                a.start_time AS "appointmentStartTime",
                a.started_at AS "appointmentStartedAt",
                a.google_meet_link AS "googleMeetLink"
            FROM email_outbox o
            JOIN "user" u ON u.id = o.recipient_user_id
            LEFT JOIN appointments a ON a.id = o.appointment_id
            WHERE o.id = ${id}
        `
        return (row as AppointmentEmailContext) ?? null
    },

    async findInvitationContext(
        id: string,
        executor: SQL = db,
    ): Promise<InvitationEmailContext | null> {
        const [row] = await executor`
            SELECT
                o.id,
                o.recipient_email AS "recipientEmail",
                u.name AS "psychoName",
                i.token,
                i.status AS "invitationStatus"
            FROM email_outbox o
            JOIN invitations i ON i.id = o.invitation_id
            JOIN "user" u ON u.id = i.psychologist_id
            WHERE o.id = ${id}
        `
        return (row as InvitationEmailContext) ?? null
    },

    async markSent(id: string, executor: SQL = db): Promise<void> {
        await executor`
            UPDATE email_outbox
            SET status = 'sent', sent_at = NOW()
            WHERE id = ${id}
        `
    },

    async markFailed(id: string, error: string, executor: SQL = db): Promise<void> {
        await executor`
            UPDATE email_outbox
            SET attempts = attempts + 1,
                last_error = ${error},
                status = CASE WHEN attempts + 1 >= ${MAX_ATTEMPTS} THEN 'failed' ELSE 'pending' END
            WHERE id = ${id}
        `
    },

    async markSkipped(id: string, executor: SQL = db): Promise<void> {
        await executor`
            UPDATE email_outbox
            SET status = 'skipped'
            WHERE id = ${id}
        `
    },

    /**
     * Upcoming appointments inside the variant's band that have not started yet —
     * one row per recipient (client and psycho), anti-joined against already-queued rows.
     */
    async findSessionReminderCandidates(
        variant: Variant,
        executor: SQL = db,
    ): Promise<ReminderCandidate[]> {
        const rows = await executor`
            SELECT a.id AS "appointmentId", r.recipient_user_id AS "recipientUserId"
            FROM appointments a
            CROSS JOIN LATERAL (VALUES (a.client_id), (a.psycho_id)) AS r(recipient_user_id)
            WHERE a.started_at IS NULL
              AND ${sessionBand(executor, variant)}
              AND NOT EXISTS (
                  SELECT 1 FROM email_outbox o
                  WHERE o.type = 'session_reminder'
                    AND o.appointment_id = a.id
                    AND o.recipient_user_id = r.recipient_user_id
                    AND o.variant = ${variant}
              )
        `
        return rows as ReminderCandidate[]
    },

    /**
     * Upcoming appointments inside the variant's band whose client still has at least one
     * not-done recommendation from a prior appointment with the same psycho. Recipient = client.
     */
    async findRecReminderCandidates(
        variant: Variant,
        executor: SQL = db,
    ): Promise<ReminderCandidate[]> {
        const rows = await executor`
            SELECT a.id AS "appointmentId", a.client_id AS "recipientUserId"
            FROM appointments a
            WHERE a.started_at IS NULL
              AND ${recBand(executor, variant)}
              AND EXISTS (
                  SELECT 1
                  FROM attachments att
                  JOIN appointments pa ON pa.id = att.appointment_id
                  LEFT JOIN recommendation_reactions rr ON rr.attachment_id = att.id
                  WHERE att.type = 'recommendation'
                    AND pa.psycho_id = a.psycho_id
                    AND pa.client_id = a.client_id
                    AND pa.id <> a.id
                    AND pa.start_time < a.start_time
                    AND NOT (rr.done IS TRUE)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM email_outbox o
                  WHERE o.type = 'rec_reminder'
                    AND o.appointment_id = a.id
                    AND o.recipient_user_id = a.client_id
                    AND o.variant = ${variant}
              )
        `
        return rows as ReminderCandidate[]
    },
} as const
