# Implementation Plan: EDG-23 — Client can see appointments

## Issues & Questions

1. **Global list API endpoint.** No backend endpoint for `GET /api/appointments` (client-scoped, all psychologists) exists. Response enriches each appointment with `psychoName` from the `user` table.

2. **Route structure.** Client routes use a flat `/client/...` structure (no `:role` prefix). The new route follows the same pattern: `route('client/appointments', ...)`.

3. **Per-psychologist scoped list.** Deferred to EDG-16 (good-to-have). This ticket implements only the global list.

4. **`onlyClientRequest` guard.** The new endpoint uses `onlyClientRequest` (not `onlyPsychoRequest`).

5. **Active appointments grouping.** `active` appointments appear in the upcoming column (same as the psychologist-side pattern: `status !== 'past'`).

6. **No `disconnected_at` filter.** The global list queries by `client_id` only — historical appointments from disconnected psychologists are included.

---

## Overview

EDG-23 adds a global appointment list for the client role. Requires: (1) a new backend `GET /api/appointments` endpoint with `onlyClientRequest` guard returning all appointments for the authenticated client enriched with `psychoName`; (2) a new frontend route `routes/client/appointments.tsx`; (3) registering the route in `routes.ts`; (4) adding an Appointments sidebar link for the client role.

---

## Implementation Steps

### 1. Backend — Add `AppointmentWithPsycho` to models

File: `backend/src/features/appointments/models.ts`

```typescript
export interface AppointmentWithPsycho extends Appointment {
    psychoName: string
}
```

### 2. Backend — Add `listAppointmentsForClient` service

File: `backend/src/features/appointments/services.ts`

```typescript
export async function listAppointmentsForClient(clientId: string): Promise<AppointmentWithPsycho[]> {
    const rows = await db`
        SELECT a.id, a.psycho_id AS "psychoId", a.client_id AS "clientId",
               a.start_time AS "startTime", a.end_time AS "endTime",
               a.status, a.google_meet_link AS "googleMeetLink", a.created_at AS "createdAt",
               u.name AS "psychoName"
        FROM appointments a
        JOIN "user" u ON u.id = a.psycho_id
        WHERE a.client_id = ${clientId}
        ORDER BY a.start_time DESC
    `
    return rows as AppointmentWithPsycho[]
}
```

### 3. Backend — Create `client-routes.ts`

File: `backend/src/features/appointments/client-routes.ts` (new)

```typescript
import { Hono } from 'hono'
import { authorized, onlyClientRequest } from '../../middlewares/auth'
import { listAppointmentsForClient } from './services'

export const clientAppointmentRoutes = new Hono()

clientAppointmentRoutes.use(authorized, onlyClientRequest).get('/', async (c) => {
    const user = c.get('user')
    const appointments = await listAppointmentsForClient(user.id)
    return c.json({ appointments }, 200)
})
```

### 4. Backend — Register route in `app.ts`

File: `backend/src/config/app.ts`

```typescript
app.route('/api/appointments', clientAppointmentRoutes)
```

### 5. Backend — Tests

File: `backend/src/features/appointments/routes.test.ts`

Add a new `describe('GET /api/appointments (client)', ...)` block:
- Authenticated client with appointments → `200 { appointments: [...] }` with `psychoName`
- Authenticated client with no appointments → `200 { appointments: [] }`
- Unauthenticated → `401`
- Psycho role → `403`

### 6. Frontend — Add `AppointmentWithPsycho` to model

File: `frontend/app/models/appointment.ts`

```typescript
export interface AppointmentWithPsycho extends Appointment {
    psychoName: string
}
```

### 7. Frontend — Add `getClientGlobalList` to service

File: `frontend/app/services/appointment.service.ts`

```typescript
getClientGlobalList: () =>
    api.get<{ appointments: AppointmentWithPsycho[] }>('/appointments'),
```

### 8. Frontend — Create `routes/client/appointments.tsx`

File: `frontend/app/routes/client/appointments.tsx` (new)

- `useRoleGuard(['client'])`.
- `useEffect` calls `appointmentService.getClientGlobalList()`.
- Splits into `pastAppointments` (`status === 'past'`) and `upcomingAppointments` (`status !== 'past'`).
- Renders two columns using `AppointmentsList` / `AppointmentCard` pattern from `client-sessions.tsx`.
- Each card links to `/client/appointments/${appointment.id}` and displays `appointment.psychoName`.
- Shows `EmptyMessage` when each list is empty.
- Shows loading and error states.

### 9. Frontend — Register route in `routes.ts`

File: `frontend/app/routes.ts`

Inside the `layout('routes/client/layout.tsx', [...])` block, add:

```typescript
route('client/appointments', 'routes/client/appointments.tsx'),
```

### 10. Frontend — Add Appointments to client sidebar

File: `frontend/app/hooks/useSidebarItems.ts`

Add to `allItems`:

```typescript
{
    title: 'Appointments',
    icon: CalendarIcon,
    href: '/client/appointments',
    availableTo: 'client',
},
```

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/features/appointments/client-routes.ts` | Client-scoped `GET /api/appointments` Hono route group |
| `frontend/app/routes/client/appointments.tsx` | Client appointment list page |
| `frontend/app/test/client-appointments.test.tsx` | Frontend tests for the client appointments route |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/models.ts` | Add `AppointmentWithPsycho` |
| `backend/src/features/appointments/services.ts` | Add `listAppointmentsForClient` |
| `backend/src/features/appointments/routes.test.ts` | Add tests for `GET /api/appointments` |
| `backend/src/config/app.ts` | Register `clientAppointmentRoutes` |
| `frontend/app/models/appointment.ts` | Add `AppointmentWithPsycho` |
| `frontend/app/services/appointment.service.ts` | Add `getClientGlobalList` |
| `frontend/app/routes.ts` | Add client appointments route |
| `frontend/app/hooks/useSidebarItems.ts` | Add Appointments sidebar item for client role |

---

## Tests

### Backend

- `GET /api/appointments`:
  - Authenticated client with appointments → `200 { appointments: [...] }` with `psychoName`
  - No appointments → `200 { appointments: [] }`
  - Unauthenticated → `401`
  - Psycho role → `403`

### Frontend (`client-appointments.test.tsx`)

- Loading state shown before API resolves.
- "Past Appointments" and "Upcoming Appointments" section labels rendered.
- Appointment cards with `psychoName` rendered; correct section split.
- Error state on API failure.
- Empty state messages when each list is empty.

---

## Out of Scope

- Per-psychologist scoped list (EDG-16).
- Past detail (EDG-24) and upcoming detail (EDG-25) — links use the correct URL but routes don't exist yet.
- Client layout `:role` prefix refactoring.
- Email notifications.
- Active appointment participation (EDG-45).
