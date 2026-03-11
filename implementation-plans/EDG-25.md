# Implementation Plan: EDG-25 — Client can review an upcoming appointment

## Issues & Questions

1. **Client appointment detail URL.** The existing `AppointmentCard` in the client appointments list links to `/client/appointments/${appointment.id}` (no `clientId` in URL). The backend's existing `GET /api/clients/:clientId/appointments/:appointmentId` is psychologist-only. A new `GET /api/appointments/:appointmentId` (client-scoped) endpoint is needed, resolving the appointment by the authenticated client's own ID.

2. **`active` status handling.** When a client views an appointment that is now `active`, show a brief message with a "Join Call" button. Redirect to the active participant view is EDG-45 scope.

3. **`past` status.** Show a placeholder — full past view is EDG-24 scope.

---

## Overview

EDG-25 adds a client-facing appointment detail page at `/client/appointments/:appointmentId`. Requires: (1) `findAppointmentByIdForClient` service + `GET /api/appointments/:appointmentId` backend route; (2) `getClientAppointmentById` service method + `useCurrentClientAppointment` hook on the frontend; (3) a new `appointment-detail.tsx` route component with upcoming detail UI (date/time, psychologist name, Google Meet section, Join Call action).

---

## Implementation Steps

### 1. Backend — Add `findAppointmentByIdForClient` service

File: `backend/src/features/appointments/services.ts`

```typescript
export async function findAppointmentByIdForClient(
    appointmentId: string,
    clientId: string,
): Promise<AppointmentWithPsycho | null> {
    const [row] = await db`
        SELECT a.id, a.psycho_id AS "psychoId", a.client_id AS "clientId",
               a.start_time AS "startTime", a.end_time AS "endTime",
               a.status, a.google_meet_link AS "googleMeetLink", a.created_at AS "createdAt",
               u.name AS "psychoName"
        FROM appointments a
        JOIN "user" u ON u.id = a.psycho_id
        WHERE a.id = ${appointmentId} AND a.client_id = ${clientId}
    `
    return (row as AppointmentWithPsycho) ?? null
}
```

### 2. Backend — Add `GET /:appointmentId` to `client-routes.ts`

File: `backend/src/features/appointments/client-routes.ts`

```typescript
clientAppointmentRoutes.use(authorized, onlyClientRequest).get('/:appointmentId', async (c) => {
    const user = c.get('user')
    const appointmentId = c.req.param('appointmentId')
    const appointment = await findAppointmentByIdForClient(appointmentId, user.id)
    if (!appointment) {
        return c.json({ error: 'NotFound' }, 404)
    }
    return c.json({ appointment }, 200)
})
```

### 3. Backend — Tests

File: `backend/src/features/appointments/routes.test.ts`

Add `describe('GET /api/appointments/:appointmentId (client)', ...)`:
- Appointment found → `200 { appointment }` with `psychoName`
- Not found or wrong client → `404 NotFound`
- Unauthenticated → `401`
- Psycho role → `403`

### 4. Frontend — Add `getClientAppointmentById` to service

File: `frontend/app/services/appointment.service.ts`

```typescript
getClientAppointmentById: (appointmentId: string) =>
    api.get<{ appointment: AppointmentWithPsycho }>(`/appointments/${appointmentId}`),
```

### 5. Frontend — Create `useCurrentClientAppointment` hook

File: `frontend/app/hooks/useCurrentClientAppointment.ts` (new)

Mirror `useCurrentAppointment` but reads only `appointmentId` (no `clientId`) from `useParams`, calls `appointmentService.getClientAppointmentById(appointmentId)`, returns `{ appointment: AppointmentWithPsycho | null, isLoading: boolean }`.

### 6. Frontend — Create `appointment-detail.tsx` route

File: `frontend/app/routes/client/appointment-detail.tsx` (new)

- `useRoleGuard(['client'])`.
- `const { appointment, isLoading } = useCurrentClientAppointment()`.
- Loading → `<p>Loading appointment...</p>`.
- Not found → `<p>Appointment not found.</p>`.
- `status === 'past'` → stub: `<p>This is a past appointment. Detail view coming in EDG-24.</p>`.
- `status === 'active'` → show date/time + "Join Call" button if link present.
- `status === 'upcoming'` → full detail:
  - Formatted date: `format(new Date(appointment.startTime), 'PPP')`.
  - Time range: `format(startTime, 'HH:mm') – format(endTime, 'HH:mm')`.
  - Psychologist name: `<p className="text-muted-foreground">{appointment.psychoName}</p>`.
  - Google Meet `<Alert>`: link if `googleMeetLink` present, else "No Google Meet link" text.
  - `<ActionsSection title="Actions">` with "Join Call" `<ActionItem icon={<LogIn />} href={...}>` — only when `googleMeetLink` is non-null.

### 7. Frontend — Register route

File: `frontend/app/routes.ts`

Inside the client layout block, add:
```typescript
route('client/appointments/:appointmentId', 'routes/client/appointment-detail.tsx'),
```

### 8. Frontend — Tests

File: `frontend/app/test/client-appointment-detail.test.tsx` (new)

Mock `useCurrentClientAppointment`, `useRoleGuard`, `ActionsSection`. Cover:
- Loading state
- Not-found state
- `past` placeholder
- `active` message
- `upcoming`: date/time rendered, psychologist name, Join Call when link present, no Join Call when link null, "No Google Meet link" text

---

## Files to Create

| Path | Description |
|------|-------------|
| `frontend/app/hooks/useCurrentClientAppointment.ts` | Hook fetching appointment by `:appointmentId` via client-scoped API |
| `frontend/app/routes/client/appointment-detail.tsx` | Client appointment detail page |
| `frontend/app/test/client-appointment-detail.test.tsx` | Tests for client appointment detail |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/services.ts` | Add `findAppointmentByIdForClient` |
| `backend/src/features/appointments/client-routes.ts` | Add `GET /:appointmentId` handler |
| `backend/src/features/appointments/routes.test.ts` | Add tests for `GET /api/appointments/:appointmentId` |
| `frontend/app/services/appointment.service.ts` | Add `getClientAppointmentById` |
| `frontend/app/routes.ts` | Register `client/appointments/:appointmentId` |

---

## Tests

### Backend

- `GET /api/appointments/:appointmentId` (client): happy path, not found, 401, 403.

### Frontend (`client-appointment-detail.test.tsx`)

- Loading state.
- Not-found state.
- `past` placeholder.
- `active` message.
- `upcoming`: date/time, psychoName, Join Call link, no Join Call when null, "No Google Meet link" text.

---

## Out of Scope

- Reschedule request (EDG-26).
- Cancellation request (EDG-59).
- Active appointment participation UI (EDG-45).
- Past appointment full detail (EDG-24).
- Real-time status transition redirect.
- Email notifications.
- No DB migration needed.
