# Plan: Feature 3 — Ping-for-session

## Context

`docs/appointment-scheduling-flow.md` defines three appointment-scheduling features. Features 1 (psycho client-page prefill) and 2 (end-of-session prompt) are already shipped (commits `16967f3`, `ce98701`). Feature 3 lets a **client** ping a linked psycho with a structured request; the psycho **Address**es it (creating an appointment) or **Decline**s it; the client can **Cancel**.

The build leans heavily on infrastructure already in place from Features 1 & 2:

- `frontend/app/components/SessionForm.tsx` — generic modal with `initialData`, `open`/`onOpenChange`, custom `title/description` props. Already mounts `PingConflictDialog` via `usePingConflictSubmit`.
- `frontend/app/hooks/useCreateAppointment.ts` — already sends `fromRequestId` and `acknowledgePingConflict` (lines 34–35) and converts a 409 `PingConflict` axios error into a `PingConflictError` (lines 46–53).
- `backend/src/features/appointments/routes.ts` — `createAppointmentSchema` already accepts `fromRequestId` and `acknowledgePingConflict` (lines 30–31), but **the POST handler ignores them** (line 161 destructures only `startTime, endTime, generateGoogleMeet`). Filling that gap is part of Feature 3.
- `nextSameWeekdayOccurrence` (`frontend/app/utils/next-occurrence.ts`) — reusable when a ping has no preferred time.

Nothing else exists yet: no `appointment_requests` table, no routes, no client UI for requesting a session, no psycho UI for handling pings.

---

## Backend

### 1. Migration — new table

New file: `backend/src/migrations/20260427NNNNNN_create-appointment-requests-table.sql` (use `bun run migration:create -- --name create-appointment-requests-table`).

```sql
CREATE TABLE appointment_requests (
    id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    psycho_id                   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    preferred_start             TIMESTAMPTZ,
    preferred_end               TIMESTAMPTZ,
    note                        TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
    status                      TEXT NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'resolved', 'declined', 'cancelled')),
    resolution_appointment_id   TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    declined_reason             TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at                 TIMESTAMPTZ,
    CHECK (
        (preferred_start IS NULL AND preferred_end IS NULL) OR
        (preferred_start IS NOT NULL AND preferred_end IS NOT NULL AND preferred_end > preferred_start)
    )
);

-- Enforce: at most one open ping per (client, psycho) pair.
CREATE UNIQUE INDEX appointment_requests_one_open_per_pair
    ON appointment_requests (client_id, psycho_id)
    WHERE status = 'pending';

CREATE INDEX appointment_requests_psycho_pending_idx
    ON appointment_requests (psycho_id) WHERE status = 'pending';
CREATE INDEX appointment_requests_client_idx
    ON appointment_requests (client_id, created_at DESC);
```

### 2. New feature folder — `backend/src/features/appointment-requests/`

Mirror the layout of `features/appointments/` and `features/invitations/`.

#### `models.ts`

```ts
export interface AppointmentRequest {
    id: string
    clientId: string
    psychoId: string
    preferredStart: string | null
    preferredEnd: string | null
    note: string | null
    status: 'pending' | 'resolved' | 'declined' | 'cancelled'
    resolutionAppointmentId: string | null
    declinedReason: string | null
    createdAt: string
    resolvedAt: string | null
}

export interface AppointmentRequestForPsycho extends AppointmentRequest {
    clientName: string
    clientImage: string | null
}

export interface AppointmentRequestForClient extends AppointmentRequest {
    psychoName: string
    psychoImage: string | null
}
```

#### `services.ts` — exports

| Function | Purpose |
| --- | --- |
| `createAppointmentRequest({ clientId, psychoId, preferredStart, preferredEnd, note })` | INSERT row. Catches the partial-unique-index violation and throws `RequestError('AlreadyPending', …)` → 409. |
| `findAppointmentRequestById(id)` | SELECT one (no role join). |
| `listRequestsForPsycho(psychoId)` | All pending + recent (last 7 days non-pending) addressed to this psycho, joined to `"user"` for `clientName/clientImage`, ordered `created_at DESC`. |
| `listRequestsForClient(clientId)` | Same, owned by this client, joined to psycho for `psychoName/psychoImage`. |
| `listRequestsForPsychoAndClient(psychoId, clientId)` | Variant for client detail page (inline display). |
| `findPendingRequestPair(clientId, psychoId)` | Used by POST validation. |
| `findOverlappingAppointmentForPsycho(psychoId, start, end)` | Reuses `findOverlappingAppointment` from `appointments/services.ts` with `clientId = psychoId` to scope to psycho only (or write a smaller variant — the existing one ORs both ids; passing the same id twice limits it to that user's appointments). |
| `findPendingPingsOverlapping(psychoId, start, end, excludeRequestId?)` | SELECT pending requests for `psycho_id = ?` whose `[preferred_start, preferred_end]` overlaps the range, joining `"user"` for `clientName`. Returns array shaped to match the frontend `PingConflict` interface (`id, clientId, clientName, preferredStart, preferredEnd`). |
| `cancelRequest(id, clientId)` | UPDATE row to `status='cancelled', resolved_at=NOW()` only if currently `pending` and owned by `clientId`. Returns `boolean`. |
| `declineRequest(id, psychoId, reason)` | UPDATE to `status='declined', declined_reason=?, resolved_at=NOW()` only if `pending` and addressed to `psychoId`. |
| `resolveRequest(id, psychoId, appointmentId)` | UPDATE to `status='resolved', resolution_appointment_id=?, resolved_at=NOW()` only if `pending` and addressed to `psychoId`. Returns `boolean` — false signals race (caller should fail / unwind). |
| `cancelAllPendingForPair(clientId, psychoId)` | Bulk UPDATE pending → cancelled for the (client, psycho) pair. Called when linkage severs. |

Also export a `RequestError` class (mirror of `InvitationError` in `features/invitations/services.ts`):

```ts
export class RequestError extends Error {
    code: string
    constructor(code: string, message: string) {
        super(message)
        this.code = code
    }
}
```

#### `routes.ts` — endpoints

All routes require `authorized`. Role-scoped per the spec.

```
POST   /api/appointment-requests              onlyClientRequest
GET    /api/appointment-requests              role-scoped: client → own; psycho → addressed
PATCH  /api/appointment-requests/:id/cancel   onlyClientRequest
PATCH  /api/appointment-requests/:id/decline  onlyPsychoRequest
```

**POST body** (zod):

```ts
z.object({
    psychoId: z.string(),
    preferredStart: z.iso.datetime({ offset: true }).optional(),
    preferredEnd: z.iso.datetime({ offset: true }).optional(),
    note: z.string().max(1000).optional(),
}).refine(d => (d.preferredStart === undefined) === (d.preferredEnd === undefined),
          { message: 'preferredEnd is required when preferredStart is set', path: ['preferredEnd'] })
  .refine(d => !d.preferredStart || new Date(d.preferredEnd!) > new Date(d.preferredStart),
          { message: 'preferredEnd must be after preferredStart', path: ['preferredEnd'] })
```

POST flow:
1. `isClientLinkedToPsycho(clientId=user.id, psychoId)` (reuse `clients/services.ts:106`). If false → 400 `NotLinked`.
2. If `preferredStart` set: `findOverlappingAppointmentForPsycho(psychoId, preferredStart, preferredEnd)`. On conflict, return generic 409 `{ error: 'TimeUnavailable', message: "That time doesn't work — please try a different time" }` (no calendar leakage per spec).
3. Call `createAppointmentRequest(...)`; catch `RequestError('AlreadyPending', …)` → 409.
4. Return 201 with the row.

**GET** flow: reads `c.get('role')` + `c.get('user')` and dispatches to `listRequestsForClient(user.id)` or `listRequestsForPsycho(user.id)`. Both return pending + non-pending within last 7 days.

**PATCH /:id/cancel**: load request → must be pending and `client_id = user.id` → `cancelRequest`. 404 / 409 otherwise.

**PATCH /:id/decline** body: `{ reason?: string (max 500) }`. Load request → must be pending and `psycho_id = user.id` → `declineRequest`.

#### Wire into `backend/src/config/app.ts`

Add: `import { appointmentRequestRoutes } from '../features/appointment-requests/routes'` and `app.route('/api/appointment-requests', appointmentRequestRoutes)`.

### 3. Modify `appointments/routes.ts` — POST handler

File: `backend/src/features/appointments/routes.ts:155–237`. Three changes inside the POST handler, **after** the existing `findOverlappingAppointment` check (line 191) and **before** the `createAppointment` call (line 197):

```ts
const { startTime, endTime, generateGoogleMeet, fromRequestId, acknowledgePingConflict } =
    c.req.valid('json')

// ... existing endTime/linked/conflict checks ...

// (NEW) Validate fromRequestId — must point at a pending ping addressed to this psycho
//       for this client. If not pending, the client cancelled mid-Address: 409.
if (fromRequestId !== undefined) {
    const ping = await findAppointmentRequestById(fromRequestId)
    if (!ping || ping.psychoId !== user.id || ping.clientId !== clientId) {
        return c.json({ error: 'RequestNotFound' }, 404)
    }
    if (ping.status !== 'pending') {
        return c.json({
            error: 'RequestNoLongerPending',
            message: 'Client cancelled this request.',
        }, 409)
    }
}

// (NEW) Ping-conflict warning. Skipped entirely when the psycho has acknowledged.
//       The fromRequestId, if any, is excluded from the overlap query (the ping
//       being addressed will resolve on success — no conflict to warn about).
if (!acknowledgePingConflict) {
    const conflictingPings = await findPendingPingsOverlapping(
        user.id,
        startTime,
        endTime,
        fromRequestId,            // exclude the one being addressed, if any
    )
    if (conflictingPings.length > 0) {
        return c.json({ error: 'PingConflict', conflictingPings }, 409)
    }
}
```

After the appointment row is created (line 204), if `fromRequestId` is set, call `resolveRequest(fromRequestId, user.id, appointment.id)`. If it returns false (race: ping was cancelled between checks), delete the just-created appointment row and return 409 `RequestNoLongerPending`. Use the same delete path Google-cleanup uses on errors.

> **Why exclude only the addressed ping from the overlap query?**
> The psycho can edit the time inside the Address modal (allowed per spec). Other psycho's pings could overlap the new time — those are still valid conflicts. So the right behavior is: query *all* pending pings overlapping the range *except* the one being addressed.

### 4. Cascade — unlink severs linkage

`backend/src/features/clients/services.ts:124` (`unlinkClientFromPsycho`) is the single place a link transitions from active to disconnected (`disconnected_at = NOW()`). Inside that function, after the UPDATE, also run an UPDATE that flips all pending pings for the pair to `cancelled` (inline SQL — keeps the call site simple and avoids a cross-feature import cycle).

### 5. Backend tests

Add `backend/src/features/appointment-requests/routes.test.ts` mirroring the patterns and helpers used in `appointments/routes.test.ts` (real DB, no mocks). Cover at least:
- Client cannot ping unlinked psycho (400).
- Duplicate pending ping rejected (409 `AlreadyPending`).
- Preferred time overlapping psycho's existing appointment → 409 `TimeUnavailable` (no leakage of conflicting appointment).
- Cancel by client flips to `cancelled`; second cancel → 404/409.
- Decline by psycho flips to `declined` and stores reason; non-pending decline → 409.
- Resolution: `POST /clients/:id/appointments` with `fromRequestId` → appointment created and ping flips to `resolved` with `resolution_appointment_id` set.
- Race: ping cancelled, then psycho submits Address → 409 `RequestNoLongerPending`, no appointment row created.
- Ping-conflict warning: psycho creates appointment overlapping a *different* pending ping → 409 `PingConflict { conflictingPings }`. Resubmit with `acknowledgePingConflict=true` → 201 and ping unchanged.
- Linkage severance: unlink → all pending pings for that pair flip to `cancelled`.

---

## Frontend

### 6. Model — `frontend/app/models/appointmentRequest.ts`

Mirror the backend `models.ts` shapes. Export `AppointmentRequest`, `AppointmentRequestForPsycho`, `AppointmentRequestForClient`, and `CreateAppointmentRequestDTO`.

### 7. Service — `frontend/app/services/appointmentRequest.service.ts`

```ts
export const appointmentRequestService = {
    create: (data: CreateAppointmentRequestDTO) =>
        api.post<{ request: AppointmentRequest }>('/appointment-requests', data),
    getList: () =>
        api.get<{
            requests: AppointmentRequestForClient[] | AppointmentRequestForPsycho[]
        }>('/appointment-requests'),
    cancel: (id: string) =>
        api.patch<{ request: AppointmentRequest }>(`/appointment-requests/${id}/cancel`),
    decline: (id: string, reason?: string) =>
        api.patch<{ request: AppointmentRequest }>(
            `/appointment-requests/${id}/decline`,
            { reason },
        ),
}
```

### 8. Hooks — small helpers

- `useAppointmentRequests()` — fetches list, exposes `requests`, `isLoading`, `refetch`.
- `useCancelAppointmentRequest()` — wraps `cancel`, toast on success/error, calls `onSuccess`.
- `useDeclineAppointmentRequest()` — wraps `decline`.
- `useCreateAppointmentRequest()` — wraps `create`. Translate 409 `AlreadyPending` and 409 `TimeUnavailable` into specific toasts; 400 `NotLinked` rare (link severed mid-form).

### 9. Client dashboard — `frontend/app/routes/client/dashboard.tsx`

Two additions, slotted into the existing card grid:

- **"Request a session" button**: render only when `data.psychologists.length > 0` (per spec, hidden when zero linked psychos). Place it inside the "My Psychologists" card header or as a primary button above the grid. Clicking opens a new `RequestSessionForm` modal (below).
- **Pending / recent ping card**: under the existing layout, show one card listing:
  - All `pending` requests with a **Cancel** button each, showing target psycho name, optional preferred time, and note preview.
  - The single most recent non-pending request from the last 7 days (resolved → "Approved — see your appointments"; declined → "Declined" + reason if present). Dismissible client-side via component state; not persisted server-side this round.
  - If the list is empty, hide the card entirely.

Use existing shadcn primitives: `Card`/`CardHeader`/`CardContent`, `Button`, `sonner` toasts.

### 10. New component — `frontend/app/components/RequestSessionForm.tsx`

Self-contained `Dialog`-based form, **not** a wrapper of `SessionForm` (different audience, different field set, different submit endpoint). Mirror `SessionForm`'s layout and use the same primitives.

Fields (zod-validated):
- **Target psycho**: required.
  - If `psychologists.length === 1`, render a non-interactive read-only display and pre-populate the value.
  - If `> 1`, render a Combobox (Popover + Command) like `SessionClientSelector.tsx` but listing psychos.
- **Preferred start** (optional) and **preferred end** (required iff start is set) — reuse `SessionDateTimePicker` from `components/session-form/`. Validation: `end > start`.
- **Note** (optional, max 1000) — shadcn `Textarea` (the `frontend/app/components/ui/` folder does not currently include `textarea` — add it).

Submit handler: `useCreateAppointmentRequest()`.

### 11. Psycho dashboard — `frontend/app/routes/psychologist/dashboard.index.tsx`

Add a new card in the existing 2-column grid (alongside Upcoming Appointments and Recent Clients): **"Pending requests"**. Show pending pings as a vertical list. Each row:

- Client name (avatar), preferred start/end (if any), note preview (truncate), `created_at` relative ("3h ago").
- **Address** primary button → opens a controlled `SessionForm` instance.
- **Decline** outline button → opens a small `AlertDialog` with optional reason `Textarea` + `Decline` / `Cancel` buttons (`DeclinePingDialog`).

Reuse `useCreateAppointment(onSuccess=refetchPings)` hook for Address submit. Build `initialData` like:

```ts
{
    clientId: ping.clientId,
    fromRequestId: ping.id,
    generateGoogleMeet: true,
    ...(ping.preferredStart && ping.preferredEnd
        ? { startTime: new Date(ping.preferredStart), endTime: new Date(ping.preferredEnd) }
        : {}),  // empty → SessionForm uses its built-in defaults (next hour, 1h duration)
}
```

Wire the `SessionForm`'s `onSubmit` such that when the API returns a 409 `RequestNoLongerPending`, an inline error appears in the modal: "Client cancelled this request." Extend `useCreateAppointment` to recognize that error code and surface it (toast + close modal + refetch list).

### 12. Client detail page — inline ping

`frontend/app/routes/psychologist/client-profile.tsx`. Below contact info / above (or alongside) the existing "Schedule Session" `ActionItem`, render a single inline `PendingPingFromClient` card if a pending ping exists for this client. The card has the same Address / Decline actions as the psycho-dashboard list — extract a single shared `<PendingPingCard psycho />` component to avoid duplication.

### 13. Address flow uses `SessionForm` unchanged

No changes to `SessionForm.tsx`, `session-form/schema.ts`, or `usePingConflictSubmit.ts` — they already accept `fromRequestId` and route 409s correctly. The only wiring is the parent components (psycho dashboard, client detail page) instantiating `SessionForm` in **controlled mode** with the right `initialData` and `open` state.

### 14. Frontend tests

The test directory is `frontend/app/test/`. Mirror existing tests' structure; cover:
- "Request a session" hidden when zero linked psychos; visible with one or more.
- Form submits with note + preferred time and renders the resulting pending card.
- Cancel removes the pending card.
- Address opens `SessionForm` with prefilled values; submit creates appointment and ping disappears.
- Decline writes the optional reason.
- Ping-conflict path on direct create: existing conflict dialog still wired (regression test).

---

## Files to create / modify

**New (backend):**
- `backend/src/migrations/20260427NNNNNN_create-appointment-requests-table.sql`
- `backend/src/features/appointment-requests/{models.ts, services.ts, routes.ts, routes.test.ts}`

**Modified (backend):**
- `backend/src/features/appointments/routes.ts` — POST handler: implement `fromRequestId` + ping-conflict warning + resolve on success.
- `backend/src/features/clients/services.ts` — `unlinkClientFromPsycho` cascades to cancel pending pings.
- `backend/src/config/app.ts` — register `/api/appointment-requests`.

**New (frontend):**
- `frontend/app/models/appointmentRequest.ts`
- `frontend/app/services/appointmentRequest.service.ts`
- `frontend/app/hooks/useAppointmentRequests.ts`
- `frontend/app/hooks/useCreateAppointmentRequest.ts`
- `frontend/app/hooks/useCancelAppointmentRequest.ts`
- `frontend/app/hooks/useDeclineAppointmentRequest.ts`
- `frontend/app/components/RequestSessionForm.tsx`
- `frontend/app/components/PendingPingCard.tsx` (shared psycho-side card)
- `frontend/app/components/DeclinePingDialog.tsx`
- `frontend/app/components/ui/textarea.tsx` (shadcn-add)

**Modified (frontend):**
- `frontend/app/routes/client/dashboard.tsx` — Request-session button + pending/recent card.
- `frontend/app/routes/psychologist/dashboard.index.tsx` — Pending requests card.
- `frontend/app/routes/psychologist/client-profile.tsx` — inline PendingPingCard.
- `frontend/app/hooks/useCreateAppointment.ts` — recognize 409 `RequestNoLongerPending` and surface inline.

---

## Verification

End-to-end smoke once implementation lands:

1. `cd backend && bun run migrate` — migration applies cleanly.
2. `cd backend && bun run dev` and `cd frontend && bun run dev`.
3. Sign in as a client linked to one psycho. Confirm "Request a session" button shows on `/client`. Submit a ping with a preferred time + note.
4. Sign in as the psycho. Confirm the ping appears on `/psycho` and on the client's detail page. Click **Address** → modal pre-fills with the preferred time. Submit → appointment is created, ping disappears, ping row in DB has `status='resolved'` and `resolution_appointment_id` set.
5. Submit a second ping. Click **Decline** with a reason. Confirm row flips to `declined` and reason is stored. Sign back in as client → see "Declined: <reason>" card on dashboard.
6. Submit a third ping. Sign back in as the client → click **Cancel**. Confirm row flips to `cancelled`.
7. Race: open Address modal as psycho, then in another browser cancel as client, then submit psycho's modal → inline error "Client cancelled this request"; no appointment row created.
8. Ping-conflict warning: as psycho on the client detail page, with a pending ping for `Mon 18:00–19:00`, click **Schedule Session** and pick `Mon 18:30–19:30`. Confirm the existing `PingConflictDialog` appears; click **Book anyway** → appointment created, ping still pending.
9. Linkage severance: as psycho disconnect the client (existing flow). Confirm the pending ping flips to `cancelled` immediately.
10. Tests: `cd backend && bun test src/features/appointment-requests/routes.test.ts` and the frontend tests pass. Lint + typecheck both apps.

---

## Out of scope (per the spec's "Rejected" section)

Do not implement: ping expiry job, availability/calendar view for clients, "stale" badges on ping cards, multi-slot proposals, recurring rules, email notifications, auto-resolve via nearby appointments, minimum-lead-time validation, or any new column on `appointments`.
