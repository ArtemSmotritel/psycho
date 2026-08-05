# Implementation Plan: EDG-20 — Psycho can see appointments

## Issues & Questions

No issues found.

## Overview

EDG-20 requires that the psychologist can see a full list of all appointments (past, active, and upcoming) for a given client. The frontend is already complete: `client-sessions.tsx` fetches data via `appointmentService.getList(clientId)`, which calls `GET /api/clients/:clientId/appointments`, separates results into past and upcoming/active columns, and renders `AppointmentCard` components. The backend route registrar in `app.ts` already mounts `appointmentRoutes` at `/api/clients/:clientId/appointments`, but `appointmentRoutes` has no `GET /` handler and `services.ts` has no list query. The entire work is backend-only: add `listAppointments` service function and a guarded `GET /` route handler, then add tests.

---

## Implementation Steps

### 1. Add `listAppointments` service function

**File**: `backend/src/features/appointments/services.ts`

Add after `isClientLinkedAndActive`:

`listAppointments(psychoId: string, clientId: string): Promise<Appointment[]>`

SQL: `SELECT id, psycho_id AS "psychoId", client_id AS "clientId", start_time AS "startTime", end_time AS "endTime", status, google_meet_link AS "googleMeetLink", created_at AS "createdAt" FROM appointments WHERE psycho_id = $psychoId AND client_id = $clientId ORDER BY start_time DESC`

No pagination — frontend handles display-level paging.

### 2. Add `GET /` handler to appointment routes

**File**: `backend/src/features/appointments/routes.ts`

Add `listAppointments` to the import from `./services`.

Add before the existing `POST /` handler:

```typescript
appointmentRoutes.use(authorized, onlyPsychoRequest).get('/', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')

    const linked = await isClientLinkedAndActive(clientId, user.id)
    if (!linked) {
        return c.json({ error: 'ClientNotLinked', message: 'This client is not in your list.' }, 400)
    }

    const appointments = await listAppointments(user.id, clientId)
    return c.json({ appointments }, 200)
})
```

### 3. Add tests

**File**: `backend/src/features/appointments/routes.test.ts`

Append after all existing blocks. Don't modify existing tests.

`describe('GET /api/clients/:clientId/appointments')` — 5 tests:
- Linked client, appointments exist → `200 { appointments: [...] }` with all statuses
- Linked client, no appointments → `200 { appointments: [] }`
- Client not linked → `400 ClientNotLinked`
- Unauthenticated → `401`
- Client role → `403`

`describe('listAppointments service (unit)')` — 2 tests:
- Returns array for matching psychoId + clientId
- Returns empty array when no appointments exist

---

## Files to Create

None.

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/services.ts` | Add `listAppointments` |
| `backend/src/features/appointments/routes.ts` | Add `GET /` handler before `POST /` |
| `backend/src/features/appointments/routes.test.ts` | Append GET tests and service unit tests |

---

## Tests

### Backend

- `GET /api/clients/:clientId/appointments`: all 5 cases above.
- `listAppointments` service: returns matching list; returns empty array.

### Frontend

Already covered in `frontend/app/test/client-sessions.test.tsx`. No new tests needed.

---

## Out of Scope

- Server-side pagination.
- Global all-clients appointment list (`sessions.tsx`, EDG-23).
- Appointment detail views (EDG-21, EDG-22).
- Active appointment UI (EDG-44).
