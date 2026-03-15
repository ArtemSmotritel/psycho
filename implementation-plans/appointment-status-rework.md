# Implementation Plan: Appointment Status Rework — Time-Aware Status via `started_at` / `ended_at`

## Resolved Questions

1. **Schema approach**: Drop the stored `status` column. Add `started_at TIMESTAMPTZ` (set by `/start`) and `ended_at TIMESTAMPTZ` (set by `/end`). Status is computed on every read using a `CASE WHEN` expression over these columns and `start_time`/`end_time` vs `NOW()`.

2. **Five statuses**: `upcoming` (before window), `warning` (in window, not started), `active` (started, not ended), `past` (ended or window elapsed after start), `missed` (window elapsed, never started).

3. **Status CASE expression** (used in every SELECT/RETURNING):
   ```sql
   CASE
       WHEN started_at IS NOT NULL
        AND (ended_at IS NOT NULL OR end_time <= NOW()) THEN 'past'
       WHEN started_at IS NOT NULL                      THEN 'active'
       WHEN NOW() < start_time                          THEN 'upcoming'
       WHEN NOW() <= end_time                           THEN 'warning'
       ELSE                                                  'missed'
   END AS status
   ```

4. **`/start` startability**: Both `upcoming` and `warning` appointments can be started (the psychologist may start late). `active`, `past`, `missed` cannot. Error remains `AppointmentNotStartable`.

5. **Edit / delete guard**: Only `upcoming` appointments can be edited or deleted. `warning` and `missed` are locked (window has started or passed). Errors remain `AppointmentNotEditable` / `AppointmentNotDeletable`.

6. **`findActiveAppointmentByPsycho`**: Cannot use `WHERE status = 'active'` since status is no longer stored. Replace with `WHERE started_at IS NOT NULL AND ended_at IS NULL AND end_time > NOW()`.

7. **Attachment status guards** (`AppointmentNotActive`): Currently block notes/impressions/recommendations on `upcoming`. With the new statuses, `warning` should also be blocked — it represents an unstarted appointment even if the time window has begun. No change needed to attachment route logic since the computed `status` field is returned and the routes read it from the fetched appointment.

8. **`startedAt` / `endedAt` in API responses**: Included in all appointment responses so the frontend can display actual vs. planned times.

9. **Frontend list grouping**: `past` and `missed` are "historical" (shown in the past section). `upcoming`, `warning`, and `active` are "current" (shown in the upcoming/active section).

10. **No `status` CHECK constraint needed**: The column is removed. Application logic enforces valid transitions.

---

## Overview

The stored `status TEXT` column is replaced by two nullable timestamp columns — `started_at` and `ended_at` — which record what actually happened. Status is derived on every SELECT via a SQL `CASE WHEN` expression, making it always accurate to the current time without any background jobs. Two new statuses (`warning`, `missed`) give visibility into appointments that were scheduled but not started. All existing `/start` and `/end` endpoints are kept; they now write a timestamp instead of a string.

---

## Implementation Steps

### 1. Database Migration

Create `backend/src/migrations/<timestamp>_appointment-status-rework.sql`:

```sql
ALTER TABLE appointments
    DROP COLUMN status,
    ADD COLUMN started_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN ended_at   TIMESTAMPTZ DEFAULT NULL;
```

No data migration needed for new deployments. For existing data with `status = 'active'` or `status = 'past'`, a migration script would be needed in production — out of scope here (dev/test DB only).

---

### 2. Backend — Shared Status Expression

Add a module-level constant in `backend/src/features/appointments/services.ts`:

```ts
const STATUS_EXPR = `
    CASE
        WHEN started_at IS NOT NULL
         AND (ended_at IS NOT NULL OR end_time <= NOW()) THEN 'past'
        WHEN started_at IS NOT NULL                      THEN 'active'
        WHEN NOW() < start_time                          THEN 'upcoming'
        WHEN NOW() <= end_time                           THEN 'warning'
        ELSE                                                  'missed'
    END
`
```

Use `db.unsafe(STATUS_EXPR)` wherever `status` appears in SELECT or RETURNING clauses.

---

### 3. Backend — Update `models.ts`

```ts
export interface Appointment {
    id: string
    psychoId: string
    clientId: string
    startTime: string
    endTime: string
    startedAt: string | null   // actual start timestamp
    endedAt: string | null     // actual end timestamp
    status: 'upcoming' | 'active' | 'past' | 'warning' | 'missed'
    googleMeetLink: string | null
    whiteboardSnapshotUrl: string | null
    createdAt: string
}
```

`AppointmentWithPsycho` and `AppointmentWithClient` extend `Appointment` — no changes needed.

---

### 4. Backend — Update All Service Functions

Every function that selects or returns appointments needs two changes:
1. Replace the bare `status` column with `${db.unsafe(STATUS_EXPR)} AS "status"`.
2. Add `started_at AS "startedAt"` and `ended_at AS "endedAt"` to the column list.

Functions to update: `createAppointment`, `findAppointmentById`, `updateAppointment`, `findAppointmentByIdForClient`, `findAppointmentByIdForParticipant`, `listAppointmentsForClient`, `listAllAppointmentsForPsycho`, `listAppointments`.

**`startAppointment`** — replace `SET status = 'active'` with `SET started_at = NOW()`:
```ts
export async function startAppointment(appointmentId: string): Promise<Appointment> {
    const [row] = await db`
        UPDATE appointments
        SET started_at = NOW()
        WHERE id = ${appointmentId}
        RETURNING ..., ${db.unsafe(STATUS_EXPR)} AS "status", started_at AS "startedAt", ended_at AS "endedAt"
    `
    return row as Appointment
}
```

**`endAppointmentWithSnapshot`** — replace `SET status = 'past'` with `SET ended_at = NOW()`:
```ts
export async function endAppointmentWithSnapshot(
    appointmentId: string,
    snapshotDataUrl: string | null,
): Promise<Appointment> {
    const [row] = await db`
        UPDATE appointments
        SET ended_at = NOW(),
            whiteboard_snapshot_url = ${snapshotDataUrl}
        WHERE id = ${appointmentId}
        RETURNING ..., ${db.unsafe(STATUS_EXPR)} AS "status", started_at AS "startedAt", ended_at AS "endedAt"
    `
    return row as Appointment
}
```

**`findActiveAppointmentByPsycho`** — replace `WHERE status = 'active'` with time-based predicate:
```ts
WHERE psycho_id = ${psychoId}
  AND started_at IS NOT NULL
  AND ended_at IS NULL
  AND end_time > NOW()
LIMIT 1
```

---

### 5. Backend — Update `routes.ts` Status Guards

**`/start` handler** (line 56): allow both `upcoming` and `warning`:
```ts
if (existing.status !== 'upcoming' && existing.status !== 'warning') {
    return c.json({ error: 'AppointmentNotStartable', ... }, 400)
}
```

**`/start` handler — update error message** to match the expanded guard:
```ts
return c.json({
    error: 'AppointmentNotStartable',
    message: 'Only upcoming or warning appointments can be started.',
}, 400)
```

**`/end` handler** (line 92): change the guard to use raw timestamp columns instead of the computed status. This ensures the psychologist can end a session even if `end_time` has already elapsed (status auto-transitions to `'past'` via the CASE expression once `end_time <= NOW()`, but `ended_at` is still `NULL` — without this fix, `/end` would return `AppointmentNotEndable` and the whiteboard snapshot would be permanently lost):
```ts
if (existing.startedAt === null || existing.endedAt !== null) {
    return c.json({
        error: 'AppointmentNotEndable',
        message: 'Only active appointments can be ended.',
    }, 400)
}
```

**`PATCH /:appointmentId` (edit)** (line 162): no change — only `upcoming` can be edited.

**`DELETE /:appointmentId`** (line 201): no change — only `upcoming` can be deleted.

---

### 6. Backend — Update `test-fixtures/db.ts`

No changes needed. `ALL_APP_TABLES` in `test-fixtures/db.ts` already lists `appointments` and will truncate it correctly between tests.

---

### 7. Backend — Tests

Update `backend/src/features/appointments/routes.test.ts`:

- Add fixtures that set `started_at` / `ended_at` directly via `testDb` instead of going through the `/start` and `/end` routes, to test time-based status computation.
- Add test cases:
  - `GET /:appointmentId` returns `status: 'warning'` when `start_time` has passed but `started_at IS NULL` and `end_time` has not passed.
  - `GET /:appointmentId` returns `status: 'missed'` when `end_time` has passed and `started_at IS NULL`.
  - `GET /:appointmentId` returns `status: 'active'` when `started_at IS NOT NULL` and `end_time` has not passed.
  - `GET /:appointmentId` returns `status: 'past'` when `started_at IS NOT NULL` and `ended_at IS NOT NULL`.
  - `GET /:appointmentId` returns `status: 'past'` when `started_at IS NOT NULL` and `end_time` has passed (auto-past without explicit `/end`).
  - `PATCH /:appointmentId/start` returns 200 when status is `warning`.
  - `PATCH /:appointmentId/start` returns 400 `AppointmentNotStartable` when status is `missed`.
  - Response includes `startedAt` and `endedAt` fields.

**Fix two existing tests that will break** — they use past timestamps (`2026-03-10`) to simulate 'active' appointments, but after migration the CASE expression will compute them as `'past'` (since `end_time <= NOW()`). Update them using a direct `testDb` UPDATE to set `started_at` rather than relying on `startAppointment()` with stale dates:

1. `GET /api/clients/:clientId/appointments` — "returns 200 with appointments array... statuses contain 'active'": replace the `apt3` setup with a direct DB update:
   ```ts
   const apt3 = await createAppointment({
       psychoId: psycho.id, clientId: client.id,
       startTime: '2026-03-10T09:00:00.000Z',
       endTime: '2026-04-01T11:00:00.000Z', // future
   })
   await testDb`UPDATE appointments SET started_at = NOW() - INTERVAL '30 minutes' WHERE id = ${apt3.id}`
   ```

2. `GET /api/psycho/appointments` — "returns 200 with active appointment when one exists": same fix — use future `endTime` and set `started_at` directly:
   ```ts
   const apt = await createAppointment({
       psychoId: psycho.id, clientId: client.id,
       startTime: '2026-03-10T09:00:00.000Z',
       endTime: '2026-04-01T11:00:00.000Z', // future
   })
   await testDb`UPDATE appointments SET started_at = NOW() - INTERVAL '30 minutes' WHERE id = ${apt.id}`
   ```

Also update the `/start` "AppointmentNotStartable" error message assertion (line 643) to match the new message: `'Only upcoming or warning appointments can be started.'`

All other existing test helpers use `createAppointment()` which does not insert a `status` column — no changes needed for those.

---

### 8. Frontend — Update `models/appointment.ts`

```ts
export interface Appointment {
    id: string
    clientId: string
    psychoId: string
    startTime: string
    endTime: string
    startedAt: string | null
    endedAt: string | null
    status: 'upcoming' | 'active' | 'past' | 'warning' | 'missed'
    googleMeetLink: string | null
    whiteboardSnapshotUrl: string | null
    createdAt: string
}
```

---

### 9. Frontend — Update Status Checks Across Routes

All files that branch on `appointment.status` need updating for the two new statuses.

**`routes/psychologist/session.tsx`**:
- `appointment.status !== 'past'` guard on impressions/recommendations fetch → `appointment.status !== 'past' && appointment.status !== 'missed'`
- `appointment.status === 'past'` branch → `appointment.status === 'past' || appointment.status === 'missed'`
- `appointment.status === 'active'` branch — no change
- In the fallthrough (upcoming/warning) actions section: **hide Edit and Delete for `warning`** — gate them on `appointment.status === 'upcoming'`, since the backend rejects edit/delete for `warning`:
  ```tsx
  {userRole === 'psychologist' && appointment.status === 'upcoming' && (
      <SessionForm ... />  {/* Edit */}
  )}
  {userRole === 'psychologist' && appointment.status === 'upcoming' && (
      <ConfirmAction ... />  {/* Delete */}
  )}
  ```

**`routes/client/appointment-detail.tsx`**:
- Same pattern as `session.tsx` — `past` checks expand to `past || missed`
- `appointment.status === 'active'` redirect to live — no change

**`routes/client/appointments.tsx`** and **`routes/psychologist/client-sessions.tsx`**:
```ts
// old
const pastAppointments = appointments.filter((a) => a.status === 'past')
const upcomingAppointments = appointments.filter((a) => a.status !== 'past')

// new
const pastAppointments = appointments.filter(
    (a) => a.status === 'past' || a.status === 'missed',
)
const upcomingAppointments = appointments.filter(
    (a) => a.status !== 'past' && a.status !== 'missed',
)
```

Also update the status badge/label display: `warning` and `missed` should render with appropriate visual treatment (e.g. amber for `warning`, red/muted for `missed`) rather than a plain `capitalize` string.

**`routes/client/live-appointment.tsx`** and **`routes/psychologist/live-session.tsx`**:
- `appointment.status !== 'active'` guard — no change (only truly `active` appointments have a live session)
- `live-appointment.tsx` polling check `updated.status === 'past'` — no change. A session that is 'active' (`started_at IS NOT NULL`) can only transition to `'past'` (via explicit `/end` or `end_time` elapsing), never to `'missed'` (which requires `started_at IS NULL`). The check remains correct.

---

### 10. Frontend — Update Tests

All test fixtures that set `status: 'upcoming'` / `'active'` / `'past'` as a literal should be checked:
- They still work since the frontend model accepts the full union type and tests mock the API response
- Add test fixtures for `status: 'warning'` and `status: 'missed'` where relevant
- Update `session.tsx` and `appointment-detail.tsx` tests to verify `missed` appointments render the past branch
- Update list filter tests to verify `missed` appointments land in the past section

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<ts>_appointment-status-rework.sql` | Drop `status`, add `started_at`, `ended_at` |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/models.ts` | Add `startedAt`, `endedAt`; expand `status` union |
| `backend/src/features/appointments/services.ts` | Add `STATUS_EXPR`; replace `status` column with computed expression in all queries; update `startAppointment`, `endAppointmentWithSnapshot`, `findActiveAppointmentByPsycho` |
| `backend/src/features/appointments/routes.ts` | Update `/start` guard to allow `warning` + update error message; update `/end` guard to use raw `startedAt`/`endedAt` columns |
| `backend/src/features/appointments/routes.test.ts` | New time-based status tests; update fixtures |
| `frontend/app/models/appointment.ts` | Add `startedAt`, `endedAt`; expand `status` union |
| `frontend/app/routes/psychologist/session.tsx` | Expand `past` checks to include `missed`; hide Edit/Delete for `warning` |
| `frontend/app/routes/client/appointment-detail.tsx` | Expand `past` checks to include `missed` |
| `frontend/app/routes/client/appointments.tsx` | Update list filter and status badge |
| `frontend/app/routes/psychologist/client-sessions.tsx` | Update list filter and status badge |

---

## Out of Scope

- Attachment route status guards (`AppointmentNotActive`) — `warning` blocking behaviour is consistent with current logic; no change required.
- Production data migration for existing `status = 'active'` / `'past'` rows.
- Email notifications for `warning` or `missed` transitions.
- Automatic `/end` when `end_time` elapses for `active` appointments (psychologist still ends manually; the status just becomes `past` on next read once `end_time` passes).
- UI notifications or polling to update status in real time on the frontend (status updates on next page load or navigation).
