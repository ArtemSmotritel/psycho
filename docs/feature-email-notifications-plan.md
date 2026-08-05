# Feature Plan — Email Notifications (transactional outbox)

## Goal

Notify users by email about:

1. **Upcoming sessions** — reminders at **24h** and **1h** before `start_time`, to **both client and psycho**.
2. **Outstanding recommendations** — reminders at **2d** and **1d** before a client's next upcoming session, to **client only**, sent only when the client has ≥1 not-done recommendation. One email per appointment per offset.
3. **New recommendation created** — transactional email to **client only**, on creation (not edit).

All emails: **Ukrainian**, rendered in a fixed **Europe/Kyiv** timezone, **minimal PII** (link back to the app; the session reminder includes the date/time, which is the point of the reminder).

## Architecture decisions (locked)

- **Pattern:** transactional outbox. Two `Bun.cron` jobs.
  - **Decision cron** (every 10 min) — runs candidate queries, inserts `pending` rows into `email_outbox` (`ON CONFLICT DO NOTHING`).
  - **Sender cron** (every 1 min) — claims `pending` rows, re-validates, renders, sends via Brevo, marks `sent`/`failed`.
- **Idempotency / dedup / audit:** a single `email_outbox` table (replaces a separate notification log). A COALESCE'd unique index enforces once-only per `(type, appointment, attachment, recipient, variant)`.
- **Send→mark ordering:** send first, then record state (rare double-send on crash accepted).
- **Render-at-send-time:** outbox stores refs, not rendered HTML — lets the sender re-validate and skip stale rows (e.g. cancelled appointment).
- **Transactional path (`rec_created`):** enqueue the outbox row in the **same DB transaction** as the recommendation insert → guaranteed no lost email. No instant send; the sender cron picks it up within ≤1 min.
- **Max attempts:** 3, then `status='failed'` (left for inspection).
- **Timezone:** fixed `Europe/Kyiv` for everyone (accepted limitation: users in other zones see Kyiv time).
- **Transport:** Brevo (`@getbrevo/brevo`), env-switched — log in dev/test, send in prod.
- **Scheduler:** `Bun.cron` **in-process callback** form (shares the DB pool). Requires **Bun ≥ 1.3.11**.

### Deferred (out of scope for now)

- Reschedule email (EDG-58) and cancel email (EDG-57) — transactional; each becomes one `enqueue()` call later.
- Notify psycho when a client reacts to a recommendation.
- Per-user notification preferences / opt-out / unsubscribe.
- Re-sending a reminder after an appointment is rescheduled (sent-state is not reset).

## Prerequisites

- Pin **Bun ≥ 1.3.11** (for `Bun.cron`).
- Add dependency: **`@getbrevo/brevo`** (official SDK).

## Module layout — `backend/src/features/notifications/`

Follows `docs/backend-feature-conventions.md` (repo = SQL only, service = logic/external APIs). **No HTTP routes** — driven by cron + one cross-feature enqueue call.

```
features/notifications/
  models.ts          # OutboxRow, NotificationType, Variant unions
  repo.ts            # NotificationsRepo — all SQL (outbox CRUD + candidate queries)
  templates.ts       # type -> render(ctx) => { subject, html, text }  (Ukrainian)
  email-service.ts   # transport: env-switched log vs Brevo
  producers.ts       # scheduled descriptors (session_reminder, rec_reminder)
  services.ts        # NotificationsService — runDecisionTick / runSenderTick / enqueueRecCreated
  cron.ts            # registerNotificationCrons() — Bun.cron wiring
  *.test.ts
```

## 1. Migration — `email_outbox`

Create via `bun run migration:create -- --name create-email-outbox`:

```sql
CREATE TABLE email_outbox (
    id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    type              TEXT NOT NULL,              -- 'session_reminder' | 'rec_reminder' | 'rec_created'
    variant           TEXT,                       -- '24h'|'1h'|'2d'|'1d' | NULL for rec_created
    recipient_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    appointment_id    TEXT REFERENCES appointments(id) ON DELETE CASCADE,
    attachment_id     TEXT REFERENCES attachments(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'sent'|'failed'|'skipped'
    attempts          INT  NOT NULL DEFAULT 0,
    last_error        TEXT,
    scheduled_for     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at           TIMESTAMPTZ
);

-- idempotency: NULLs don't collide in a plain UNIQUE, so COALESCE the nullables
CREATE UNIQUE INDEX email_outbox_dedup ON email_outbox (
    type,
    COALESCE(appointment_id, ''),
    COALESCE(attachment_id, ''),
    recipient_user_id,
    COALESCE(variant, '')
);

CREATE INDEX email_outbox_pending ON email_outbox (status, scheduled_for)
    WHERE status = 'pending';
```

## 2. Config / env

Add to `.env.example` and read where noted:

```
EMAIL_ENABLED=false             # transport switch; false -> log instead of send
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Helpsycho
```

Deep links reuse the existing `FRONTEND_URL`. Brevo requires a **verified sender** (`BREVO_SENDER_EMAIL`) before it will send; free tier ~300 emails/day.

## 3. Transport — `email-service.ts` (type-agnostic)

```ts
export const emailService = {
  async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    if (process.env.EMAIL_ENABLED !== 'true') {
      log.info(`[email:dev] -> ${to} | ${subject}`, { text })
      return
    }
    // Brevo TransactionalEmailsApi.sendTransacEmail(...), sender from env
  },
}
```

Throws on Brevo failure → caught by the sender tick, which records `last_error` (never crashes the tick).

## 4. Templates — `templates.ts`

Registry `Record<NotificationType, (ctx) => { subject, html, text }>`, Ukrainian, minimal PII:

- `session_reminder` — includes **date/time** via `Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', dateStyle: 'long', timeStyle: 'short' })`; optional meet link (handle null); deep link.
- `rec_reminder` — "У вас є невиконані рекомендації перед сесією" + link. No content.
- `rec_created` — "Ваш психолог додав нову рекомендацію" + link.

Shared helpers: `formatKyiv(ts)`, `appLink(role, path)` (built from `FRONTEND_URL`). Bun bundles full ICU, so `uk-UA` + `timeZone` formatting works.

## 5. Repo — `NotificationsRepo` (all SQL)

- `enqueue(row, executor = db)` → `INSERT ... ON CONFLICT DO NOTHING` (used by decision cron **and** the same-txn rec_created hook).
- `claimPending(limit)` → `SELECT ... WHERE status='pending' AND scheduled_for <= NOW() AND attempts < 3 ORDER BY created_at LIMIT $1`.
- `markSent(id)`, `markFailed(id, error)` (increments `attempts`; sets `status='failed'` when attempts reaches 3, else leaves `pending` for retry), `markSkipped(id)`.

### Candidate queries (threshold + banding + anti-join on outbox)

**Banding** prevents a duplicate when an appointment is created/booked inside a more-urgent window: each variant fires only within its own band.

- `findSessionReminderCandidates(variant)` — one row per recipient (`client_id` and `psycho_id`):
  - **24h:** `started_at IS NULL AND start_time <= NOW() + interval '24 hours' AND start_time > NOW() + interval '1 hour'`
  - **1h:**  `started_at IS NULL AND start_time <= NOW() + interval '1 hour' AND start_time > NOW()`
  - plus `NOT EXISTS (SELECT 1 FROM email_outbox o WHERE o.type='session_reminder' AND o.appointment_id=a.id AND o.recipient_user_id=u.id AND o.variant=$variant)`

- `findRecReminderCandidates(variant)` — recipient = `client_id` of the **upcoming** appointment; banded the same way (**2d:** `> NOW() + 1 day`, **1d:** within the last day); **only if** the client has ≥1 recommendation from prior appointments with that psycho that is **not done** — `LEFT JOIN recommendation_reactions ... WHERE NOT (done IS TRUE)` (covers the "no reaction row" case). One row per appointment per variant.

> Banding lower bounds: 24h band's lower = 1h threshold; 2d band's lower = 1d threshold. Most-urgent variant (1h / 1d) has lower bound = `NOW()`.

## 6. Producers + Service

```ts
const SCHEDULED = [
  { type:'session_reminder', variants:['24h','1h'], find: findSessionReminderCandidates },
  { type:'rec_reminder',     variants:['2d','1d'],  find: findRecReminderCandidates },
]

NotificationsService.runDecisionTick()  // loop SCHEDULED x variants -> enqueue(ON CONFLICT DO NOTHING)
NotificationsService.runSenderTick()    // claimPending -> re-fetch ctx -> render -> emailService.send -> markSent/markFailed/markSkipped
```

- `scheduled_for = NOW()` on enqueue (the threshold query already gates timing).
- Sender **re-validates** before sending: if the appointment was cancelled/deleted in the gap → `markSkipped`.

## 7. Transactional hook — `rec_created` (same transaction)

In `attachments/services.ts` `create()`, inside the existing `db.begin`, after the recommendation insert:

```ts
if (params.type === 'recommendation') {
  const clientId = await AppointmentsRepo.findClientId(params.appointmentId, tx)
  await NotificationsRepo.enqueue({
    type: 'rec_created',
    recipientUserId: clientId,
    appointmentId: params.appointmentId,
    attachmentId: id,
    variant: null,
  }, tx) // commits atomically with the recommendation
}
```

Create-only (not edit), one row per recommendation, no instant send.

## 8. Cron wiring — `cron.ts`, called from `index.ts`

```ts
export function registerNotificationCrons() {
  Bun.cron('*/10 * * * *', () => NotificationsService.runDecisionTick())
  Bun.cron('* * * * *',    () => NotificationsService.runSenderTick())
}
```

Call `registerNotificationCrons()` from `index.ts` after `Bun.serve`.

## 9. Testing (minimal mocks, per CLAUDE.md)

- `EMAIL_ENABLED=false` → transport logs; tests assert **outbox state**, not network.
- **Decision:** appointment inside the 24h band → `runDecisionTick()` → 2 pending rows (client + psycho); run again → no duplicates (dedup index). Appointment booked <1h out → only the 1h row (banding).
- **rec_reminder:** appointment + undone recommendation → 1 row; mark rec done → 0 rows.
- **rec_created:** `AttachmentsService.create` a recommendation → outbox row exists in the same committed txn.
- **Sender:** pending row → `runSenderTick()` → `status='sent'`; force transport throw → `attempts` increments, `status='failed'` after 3.

## Implementation order

1. Migration (`email_outbox`)
2. Transport (`email-service.ts`) + templates
3. Repo (`NotificationsRepo`) + service (`runDecisionTick` / `runSenderTick`) + producers
4. Cron wiring (`cron.ts` + `index.ts`)
5. `rec_created` hook in attachments service
6. Tests

## Known minor limitations (accepted)

- Single-instance only — the in-process cron would double-send if two backend instances ran (the dedup index still prevents most of it). Documented limitation.
- Reminders missed entirely if the server is down across the whole band window.
- Fixed Europe/Kyiv time shown to all users regardless of their actual location.
- No opt-out / unsubscribe yet.
