# Implementation Plan: EDG-22 — Psycho can review an upcoming appointment

## Issues & Questions

1. **Route param name mismatch.** The existing `routes.ts` uses `:sessionId` for the appointment detail segment, but the CLAUDE.md URL convention is `/:role/clients/:clientId/appointments/:appointmentId/...`. The param name must be corrected to `:appointmentId` as part of this ticket.

2. **Missing backend `GET /:appointmentId` route.** The frontend `appointmentService.getById` already exists and references `GET /api/clients/:clientId/appointments/:appointmentId`, but this backend route does not exist yet.

3. **Start button scope.** The ticket says "Start button (no time constraint)." Calling the start action transitions `status` to `active`. EDG-44 covers the active appointment UI. **Resolution: implement the actual API call and status transition** — add `PATCH /:appointmentId/start` route and `startAppointment` service. EDG-44 builds the active UI on top.

4. **Decision 22 conflict check.** Decision 22 requires a warning and inline "End previous appointment" button if another appointment is already active. This check is triggered at the Start button — which lives in EDG-22. A new `findActiveAppointmentByPsycho` service query is included in scope.

5. **`useCurrentSession` uses fake data.** A new `useCurrentAppointment` hook must replace it in `session.tsx`. `useCurrentSession` is left untouched for now.

6. **`client-layout.tsx` breadcrumb uses `useCurrentSession`.** Must be updated to use `useCurrentAppointment()`.

---

## Overview

EDG-22 implements the psychologist's upcoming appointment detail page. When a psychologist clicks an upcoming appointment from the list, they see the appointment date/time range, the Google Meet link (if present), and a "Start Appointment" button. Clicking Start transitions the appointment to `active` (enforcing the one-active-at-a-time rule) and navigates to the live route. The implementation requires: a backend `GET /:appointmentId` endpoint, a backend `PATCH /:appointmentId/start` endpoint with conflict detection, a new `useCurrentAppointment` frontend hook, and an update to `session.tsx` to render real data with upcoming-specific UI.

---

## Implementation Steps

### 1. Backend — Add `GET /:appointmentId` route

File: `backend/src/features/appointments/routes.ts`

Add a handler using `authorized` and `onlyPsychoRequest` middleware. Call the existing `findAppointmentById(appointmentId, user.id, clientId)`. Return `404 { error: 'NotFound' }` if null, `200 { appointment }` on success. No new service function needed.

### 2. Backend — Add `startAppointment` service

File: `backend/src/features/appointments/services.ts`

```typescript
export async function startAppointment(appointmentId: string): Promise<Appointment> {
    const [row] = await db`
        UPDATE appointments
        SET status = 'active'
        WHERE id = ${appointmentId}
        RETURNING id, psycho_id AS "psychoId", client_id AS "clientId",
                  start_time AS "startTime", end_time AS "endTime",
                  status, google_meet_link AS "googleMeetLink", created_at AS "createdAt"
    `
    return row as Appointment
}
```

### 3. Backend — Add `findActiveAppointmentByPsycho` service

File: `backend/src/features/appointments/services.ts`

```typescript
export async function findActiveAppointmentByPsycho(psychoId: string): Promise<Appointment | null> {
    const [row] = await db`
        SELECT id, psycho_id AS "psychoId", client_id AS "clientId",
               start_time AS "startTime", end_time AS "endTime",
               status, google_meet_link AS "googleMeetLink", created_at AS "createdAt"
        FROM appointments
        WHERE psycho_id = ${psychoId} AND status = 'active'
        LIMIT 1
    `
    return (row as Appointment) ?? null
}
```

### 4. Backend — Add `PATCH /:appointmentId/start` route

File: `backend/src/features/appointments/routes.ts`

Logic:
1. `findAppointmentById(appointmentId, user.id, clientId)` → if null → `404`.
2. If `existing.status !== 'upcoming'` → `400 { error: 'AppointmentNotStartable', message: 'Only upcoming appointments can be started.' }`.
3. `findActiveAppointmentByPsycho(user.id)` → if result exists → `400 { error: 'AnotherAppointmentActive', message: 'End your active appointment before starting a new one.', activeAppointmentId: result.id }`.
4. `startAppointment(appointmentId)` → return `200 { appointment }`.

### 5. Frontend — Fix route param name

File: `frontend/app/routes.ts`

Change `prefix(':sessionId', [...])` to `prefix(':appointmentId', [...])`.

### 6. Frontend — Create `useCurrentAppointment` hook

File: `frontend/app/hooks/useCurrentAppointment.ts` (new)

Mirror `useCurrentClient` pattern:
- `useParams<{ clientId: string; appointmentId: string }>()`.
- `useState<Appointment | null>(null)` + `useState<boolean>(true)` for loading.
- `useEffect` calls `appointmentService.getById(clientId, appointmentId)` on mount.
- Returns `{ appointment, isLoading }`.

### 7. Frontend — Add `start` to `appointmentService`

File: `frontend/app/services/appointment.service.ts`

```typescript
start: (clientId: string, appointmentId: string) =>
    api.patch<{ appointment: Appointment }>(
        `/clients/${clientId}/appointments/${appointmentId}/start`,
    ),
```

### 8. Frontend — Rewrite `session.tsx` for upcoming appointment detail

File: `frontend/app/routes/psychologist/session.tsx`

Replace all fake-data rendering. Remove: `useCurrentSession`, `fakeSessions`, `Session`, `isSessionActive`, `isSessionMoreThanDayOld`, `Attachment`, `SessionTabContent`, `AttachmentForm`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

New component structure:

1. `const { appointment, isLoading } = useCurrentAppointment()`.
2. `const { role, clientId } = useParams()`.
3. States: `isStarting`, `isDeleting`, `isUpdating`, `startError: { message: string; activeAppointmentId: string } | null`.
4. Loading → `<p>Loading appointment...</p>`.
5. Not found → `<p>Appointment not found.</p>`.
6. Branch on `appointment.status`:
   - `'past'` → stub `<p>This is a past appointment. Detail view coming in EDG-21.</p>`.
   - `'active'` → `<Link>` button navigating to the `live` sub-route.
   - `'upcoming'` → full upcoming detail UI:

**Upcoming detail UI:**
- Date/time header: `format(new Date(appointment.startTime), 'PPP')` and `HH:mm – HH:mm` range.
- Google Meet `Alert`: show link if `googleMeetLink` present, else "No Google Meet link" message.
- `startError` inline warning: if set, show `Alert` with message and "Go to active appointment" `Button`.
- `ActionsSection` with:
  - **Start Appointment** `Button` (upcoming + psychologist): call `appointmentService.start`, handle `AnotherAppointmentActive` by setting `startError`, on success navigate to `live` sub-route.
  - **Edit Appointment** `SessionForm mode="edit"` in `ActionItem`.
  - **Join Call** `ActionItem` (only if `googleMeetLink` set) — external link.
  - **Visit Client Profile** `ActionItem`.
  - **Delete Appointment** `ConfirmAction`-wrapped `ActionItem` (destructive): call `appointmentService.delete`, navigate to appointments list.

### 9. Frontend — Update `client-layout.tsx` breadcrumb

File: `frontend/app/routes/psychologist/client-layout.tsx`

- Replace `useCurrentSession()` with `useCurrentAppointment()`.
- Replace `getSessionName(session)` with `format(new Date(appointment.startTime), 'PPP HH:mm')`.
- Remove imports of `useCurrentSession`, `Session`, `getSessionName`. Add `useCurrentAppointment`, `format` from `date-fns`.

---

## Files to Create

| Path | Description |
|------|-------------|
| `frontend/app/hooks/useCurrentAppointment.ts` | Hook that fetches a single appointment by URL params |
| `frontend/app/test/upcoming-appointment.test.tsx` | Frontend tests for upcoming appointment detail view |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/routes.ts` | Add `GET /:appointmentId` and `PATCH /:appointmentId/start` |
| `backend/src/features/appointments/services.ts` | Add `startAppointment` and `findActiveAppointmentByPsycho` |
| `backend/src/features/appointments/routes.test.ts` | Add tests for the two new routes and service unit tests |
| `frontend/app/routes.ts` | Rename `:sessionId` → `:appointmentId` |
| `frontend/app/services/appointment.service.ts` | Add `start` method |
| `frontend/app/routes/psychologist/session.tsx` | Replace fake-data rendering with real API + upcoming UI |
| `frontend/app/routes/psychologist/client-layout.tsx` | Replace `useCurrentSession` with `useCurrentAppointment` in breadcrumb |

---

## Tests

### Backend (append to `routes.test.ts`)

- `GET /api/clients/:clientId/appointments/:appointmentId`:
  - Happy path → `200 { appointment }`
  - Not found → `404`
  - Wrong psychoId → `404`
  - Unauthenticated → `401`
  - Client role → `403`

- `PATCH /api/clients/:clientId/appointments/:appointmentId/start`:
  - Happy path → `200 { appointment }` with `status: 'active'`
  - Not found → `404`
  - Status `past` → `400 AppointmentNotStartable`
  - Status `active` → `400 AppointmentNotStartable`
  - Another active appointment exists → `400 AnotherAppointmentActive` with `activeAppointmentId`
  - Unauthenticated → `401`
  - Client role → `403`

- `startAppointment` service (unit): returns appointment with `status: 'active'`.
- `findActiveAppointmentByPsycho` service (unit): returns active appointment; returns `null` when none.

### Frontend (`upcoming-appointment.test.tsx`)

- Loading state shown while API is pending.
- Not-found state shown when `getById` rejects.
- Formatted date range rendered after data loads.
- Google Meet link rendered when present; "No Google Meet link" text when absent.
- "Start Appointment" button rendered for upcoming; absent for past.
- `appointmentService.start` called on Start button click.
- `AnotherAppointmentActive` inline warning with navigation link shown on that error.
- `toast.error` shown on generic start failure.
- Edit and Delete actions rendered for upcoming (psychologist role).

---

## Out of Scope

- Past appointment detail view (EDG-21).
- Whiteboard / active appointment UI (EDG-44).
- Client-side upcoming appointment detail (EDG-25).
- Google Meet auto-generation via Calendar API.
- Email notification when appointment is started (EDG-66).
- `useCurrentSession` hook and `Session` model deletion (deferred).
- `sessions.tsx` global list — still uses fake data.
