# Implementation Plan: EDG-19 — Psycho can delete an appointment

## Issues & Questions

1. **CORS `allowMethods` missing `'PATCH'`.** The `cors()` call in `backend/src/config/app.ts` has `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']` — `'PATCH'` is missing. This affects EDG-18 (already shipped). Fix as part of this ticket.

2. **Email notification.** EDG-57 is the dedicated email ticket for appointment deletion notification. Place a `// TODO: EDG-57 — send appointment deleted email to client` comment in the route handler; actual sending is deferred.

3. **Only `upcoming` appointments can be deleted.** Decision 23 is clear. Guard with `400 AppointmentNotDeletable` for any other status.

4. **`session.tsx` still uses fake data.** Only the delete handler needs to be wired; full detail-view wiring is EDG-22.

---

## Overview

EDG-19 adds the ability for a psychologist to delete an upcoming appointment. Involves: (1) `deleteAppointment` service function; (2) `DELETE /:appointmentId` backend route with `upcoming`-only guard; (3) `delete` method on frontend `appointmentService`; (4) wiring the existing "Delete Session" stub in `session.tsx` to call the real API with toast feedback and navigation back to the appointments list.

---

## Implementation Steps

### 1. Fix CORS `allowMethods`

**File**: `backend/src/config/app.ts`

Add `'PATCH'` to `allowMethods`: `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`.

### 2. Add `deleteAppointment` service function

**File**: `backend/src/features/appointments/services.ts`

```typescript
export async function deleteAppointment(appointmentId: string): Promise<void> {
    await db`DELETE FROM appointments WHERE id = ${appointmentId}`
}
```

### 3. Add `DELETE /:appointmentId` route handler

**File**: `backend/src/features/appointments/routes.ts`

Append after the PATCH handler:

```typescript
.delete('/:appointmentId', async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const appointmentId = c.req.param('appointmentId')

    const existing = await findAppointmentById(appointmentId, user.id, clientId)
    if (!existing) {
        return c.json({ error: 'NotFound' }, 404)
    }

    if (existing.status !== 'upcoming') {
        return c.json(
            { error: 'AppointmentNotDeletable', message: 'Only upcoming appointments can be deleted.' },
            400,
        )
    }

    await deleteAppointment(appointmentId)

    // TODO: EDG-57 — send appointment deleted email to client

    return c.json({ success: true }, 200)
})
```

### 4. Add `delete` method to frontend appointment service

**File**: `frontend/app/services/appointment.service.ts`

```typescript
delete: (clientId: string, appointmentId: string) =>
    api.delete<{ success: boolean }>(`/clients/${clientId}/appointments/${appointmentId}`),
```

### 5. Wire real delete in `session.tsx`

**File**: `frontend/app/routes/psychologist/session.tsx`

- Add `useNavigate` to imports.
- Add `const navigate = useNavigate()` and `const { role } = useParams()`.
- Add `const [isDeleting, setIsDeleting] = useState(false)`.
- Replace stub `handleDeleteSession` with:
  ```typescript
  const handleDeleteSession = async () => {
      if (!session) return
      setIsDeleting(true)
      try {
          await appointmentService.delete(session.clientId, session.id)
          toast.success('Appointment deleted.')
          navigate(`/${role}/clients/${session.clientId}/appointments`)
      } catch {
          toast.error('Failed to delete appointment. Please try again.')
      } finally {
          setIsDeleting(false)
      }
  }
  ```
- Pass `disabled={isDeleting}` to the delete trigger `ActionItem`.
- Update dialog copy: "Delete Session" → "Delete Appointment", session → appointment in description.

---

## Files to Create

| Path | Description |
|------|-------------|
| `frontend/app/test/session-delete.test.tsx` | Frontend tests for delete appointment flow |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Add `'PATCH'` to CORS `allowMethods` |
| `backend/src/features/appointments/services.ts` | Add `deleteAppointment` |
| `backend/src/features/appointments/routes.ts` | Add `DELETE /:appointmentId` handler |
| `backend/src/features/appointments/routes.test.ts` | Add DELETE route tests and service unit test |
| `frontend/app/services/appointment.service.ts` | Add `delete` method |
| `frontend/app/routes/psychologist/session.tsx` | Wire real delete, add loading state, update copy |

---

## Tests

### Backend

- `DELETE /api/clients/:clientId/appointments/:appointmentId`:
  - Happy path → `200 { success: true }`
  - Not found → `404 NotFound`
  - Status `past` → `400 AppointmentNotDeletable`
  - Status `active` → `400 AppointmentNotDeletable`
  - Unauthenticated → `401`
  - Client role → `403`

- `deleteAppointment` service (unit): resolves without error.

### Frontend (`session-delete.test.tsx`)

- Confirms delete calls `appointmentService.delete` with correct `clientId` and `appointmentId`.
- On success: `toast.success('Appointment deleted.')` called.
- On success: `navigate` called with the appointments list URL.
- On failure: `toast.error('Failed to delete appointment. Please try again.')` called.
- Delete trigger disabled while `isDeleting` is true.

---

## Out of Scope

- Sending deletion email to client (EDG-57).
- Full detail view wiring from real API (EDG-22).
- Client-side deletion capability.
- Soft-delete / archiving.
