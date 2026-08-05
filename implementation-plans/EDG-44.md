# Implementation Plan: EDG-44 — Psycho can conduct an active appointment

## Issues & Questions

1. **`live-session.tsx` is a stub.** Must be fully replaced. The Excalidraw integration stays as a visual placeholder — real-time sync is EDG-46.

2. **`useHasActiveAppointment` is stubbed to `false`.** Must be wired to a real backend endpoint (has a `TODO: Implement real active appointment detection in EDG-44` comment). Affects sidebar role-switcher disable logic (Decision 14).

3. **No global psycho active-appointment endpoint.** `appointmentRoutes` is mounted at `/api/clients/:clientId/appointments` (requires `clientId`), so it can't serve a global check. A new `psycho-routes.ts` file and `/api/psycho/appointments` mount point are needed. `findActiveAppointmentByPsycho` already exists in services.

4. **`session.tsx` already handles `active` status.** It renders a link to the `/live` sub-route. No change needed there.

---

## Overview

EDG-44 builds the psychologist's live active-appointment page. Backend needs: `PATCH /:appointmentId/end` (transitions appointment to `past`) and `GET /api/psycho/appointments` (returns active appointment or null for the sidebar hook). Frontend replaces the stub `live-session.tsx` with a real page: fetches appointment, shows time range + elapsed timer, "Join Call" button if Meet link exists, Excalidraw whiteboard placeholder, and a confirmed "End Appointment" action. `useHasActiveAppointment` is wired to the new backend route.

---

## Implementation Steps

### 1. Backend — add `endAppointment` service

File: `backend/src/features/appointments/services.ts`

Add after `findActiveAppointmentByPsycho`:

```typescript
export async function endAppointment(appointmentId: string): Promise<Appointment> {
    const [row] = await db`
        UPDATE appointments
        SET status = 'past'
        WHERE id = ${appointmentId}
        RETURNING id, psycho_id AS "psychoId", client_id AS "clientId",
                  start_time AS "startTime", end_time AS "endTime",
                  status, google_meet_link AS "googleMeetLink", created_at AS "createdAt"
    `
    return row as Appointment
}
```

### 2. Backend — add `PATCH /:appointmentId/end` route

File: `backend/src/features/appointments/routes.ts`

Add after the existing `/start` handler. Import `endAppointment` from `./services`.

Logic:
1. `findAppointmentById(appointmentId, user.id, clientId)` → `404` if null.
2. If `existing.status !== 'active'` → `400 { error: 'AppointmentNotEndable', message: 'Only active appointments can be ended.' }`.
3. `endAppointment(appointmentId)` → `200 { appointment }`.
4. Add comment: `// TODO: EDG-47 — save whiteboard snapshot before ending`.

### 3. Backend — create `psycho-routes.ts`

File: `backend/src/features/appointments/psycho-routes.ts` (new)

Mirror `client-routes.ts` structure. One route:

- `GET /` — `authorized` + `onlyPsychoRequest`. Calls `findActiveAppointmentByPsycho(user.id)`. Returns `200 { appointment }` (null if none active).

### 4. Backend — register `psychoAppointmentRoutes` in `app.ts`

File: `backend/src/config/app.ts`

```typescript
import { psychoAppointmentRoutes } from '../features/appointments/psycho-routes'
// ...
app.route('/api/psycho/appointments', psychoAppointmentRoutes)
```

### 5. Backend — tests for `PATCH /:appointmentId/end`

File: `backend/src/features/appointments/routes.test.ts`

Add `describe('PATCH /api/clients/:clientId/appointments/:appointmentId/end', ...)` following the exact mocking pattern from the `/start` test block. See Tests section for cases.

### 6. Frontend — add `end` and `getActiveForPsycho` to `appointmentService`

File: `frontend/app/services/appointment.service.ts`

```typescript
end: (clientId: string, appointmentId: string) =>
    api.patch<{ appointment: Appointment }>(
        `/clients/${clientId}/appointments/${appointmentId}/end`,
    ),
getActiveForPsycho: () =>
    api.get<{ appointment: Appointment | null }>('/psycho/appointments'),
```

### 7. Frontend — implement `useHasActiveAppointment`

File: `frontend/app/hooks/useHasActiveAppointment.ts`

Replace the stub:
- If `activeRole !== 'psycho'` → skip API, return `{ hasActiveAppointment: false, isLoading: false }`.
- On mount, call `appointmentService.getActiveForPsycho()`.
- Set `hasActiveAppointment = true` if `res.data.appointment !== null`.
- Catch errors silently → return `{ hasActiveAppointment: false }`.
- Return `{ hasActiveAppointment: boolean, isLoading: boolean }`.

Use `useAuth()` from `~/contexts/auth-context` to read `activeRole`.

### 8. Frontend — rewrite `live-session.tsx`

File: `frontend/app/routes/psychologist/live-session.tsx`

Replace the stub entirely:

1. `useParams<{ role, clientId, appointmentId }>()`.
2. `useRoleGuard(['psychologist'])`.
3. `useCurrentAppointment()` for data-fetching.
4. `isEnding: boolean` state.
5. Loading → `<p>Loading appointment...</p>`.
6. Not found or status not `active` → error message + back link to `/${role}/clients/${clientId}/appointments/${appointmentId}`.
7. When `active`:
   - **Header**: formatted date (`format(startTime, 'PPP')`) + time range (`HH:mm – HH:mm`) + elapsed timer (keep existing stub's `useEffect`/`setInterval` logic).
   - **Google Meet Alert**: link if present, else "No Google Meet link" text (mirror `session.tsx` pattern).
   - **ActionsSection**:
     - "Join Call" `ActionItem href={googleMeetLink}` — only if link present.
     - "End Appointment" in `ConfirmAction` (title: "End Appointment", description: "Are you sure you want to end this appointment? It will be moved to past status."). On confirm: call `appointmentService.end(clientId, appointmentId)`, `toast.success('Appointment ended.')`, navigate to detail page. On error: `toast.error('Failed to end appointment. Please try again.')`. Always: `setIsEnding(false)`.
   - **Whiteboard**: keep existing lazy-loaded Excalidraw `<Suspense>` block below actions.

### 9. Frontend — tests for `live-session.tsx`

File: `frontend/app/test/live-session.test.tsx` (new)

Mock: `appointmentService` (getById + end), `useRoleGuard`, `useNavigate`, `sonner`, `@excalidraw/excalidraw` as `<div data-testid="excalidraw" />`. See Tests section for cases.

### 10. Frontend — tests for `useHasActiveAppointment`

File: `frontend/app/test/useHasActiveAppointment.test.tsx` (new)

Use `renderHook` from `@testing-library/react`. See Tests section for cases.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/features/appointments/psycho-routes.ts` | Hono router at `/api/psycho/appointments`; `GET /` returns active appointment or null |
| `frontend/app/test/live-session.test.tsx` | Tests for the rewritten `live-session.tsx` |
| `frontend/app/test/useHasActiveAppointment.test.tsx` | Tests for `useHasActiveAppointment` hook |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/services.ts` | Add `endAppointment` |
| `backend/src/features/appointments/routes.ts` | Add `PATCH /:appointmentId/end`; import `endAppointment` |
| `backend/src/features/appointments/routes.test.ts` | Add `end` route test block |
| `backend/src/config/app.ts` | Register `psychoAppointmentRoutes` |
| `frontend/app/services/appointment.service.ts` | Add `end` and `getActiveForPsycho` |
| `frontend/app/hooks/useHasActiveAppointment.ts` | Replace stub with real implementation |
| `frontend/app/routes/psychologist/live-session.tsx` | Fully replace stub with functional active appointment page |

---

## Tests

### Backend

- `PATCH /:appointmentId/end`:
  - Happy path (active appointment) → `200` with `status: 'past'`
  - Not found → `404`
  - Status `upcoming` → `400 AppointmentNotEndable`
  - Status `past` → `400 AppointmentNotEndable`
  - Unauthenticated → `401`
  - Client role → `403`

- `GET /api/psycho/appointments`:
  - Has active appointment → `200 { appointment: { ... } }`
  - No active appointment → `200 { appointment: null }`
  - Unauthenticated → `401`
  - Client role → `403`

### Frontend

- `live-session.tsx`:
  - Loading state shown.
  - Time range + elapsed timer rendered for active appointment.
  - "Join Call" rendered when `googleMeetLink` present.
  - "Join Call" absent when `googleMeetLink` null.
  - `appointmentService.end` called + navigate on confirm.
  - `toast.error` on API failure.
  - Error/fallback shown when appointment null or not active.

- `useHasActiveAppointment`:
  - Returns `false` immediately when `activeRole !== 'psycho'` (no API call).
  - Returns `true` when API returns an appointment.
  - Returns `false` when API returns `{ appointment: null }`.
  - Returns `false` silently on API error.

---

## Out of Scope

- Real-time whiteboard sync (EDG-46).
- Whiteboard snapshot on end (EDG-47).
- Client active participation page (EDG-45).
- Email notification to client on appointment start (EDG-66).
- "Another appointment active" conflict warning in live page (already in `session.tsx`, EDG-22).
- Google Calendar / Meet link auto-generation.
