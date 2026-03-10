# Implementation Plan: EDG-17 — Psycho can schedule appointments

## Issues & Questions

1. **Google Meet auto-generation scope.** `generateGoogleMeet` intent will be stored in DB; actual Google Calendar API integration is deferred. `googleMeetLink` stays `null` for this ticket.

2. **`endTime` required (Decision 30).** The existing `SessionForm` only has `startTime`. Add `endTime` field with validation `endTime > startTime`.

3. **Route renaming.** Rename frontend URL segments from `sessions` to `appointments` in `routes.ts` and related files as part of this ticket.

4. **Client picker.** When used from the global sessions page, wire the real client list from the API. When in a client context, default to the current client.

5. **`Session` model is legacy.** Replace with a proper `Appointment` model with `status: 'upcoming' | 'active' | 'past'`.

6. **Auth check.** Before creating an appointment, verify the client is still actively linked to the psychologist (not disconnected). Return `400 ClientNotLinked` if not.

7. **Backend URL pattern.** Use `/api/clients/:clientId/appointments` (nested, consistent with client-scoped operations).

---

## Overview

EDG-17 adds the ability for a psychologist to create an appointment for a specific client. Involves: (1) new `appointments` DB table; (2) backend feature module with `POST /api/clients/:clientId/appointments`; (3) frontend `Appointment` model, `appointment.service.ts`, updated `SessionForm`, and wired route pages; (4) renaming URL segments from `sessions` to `appointments`.

---

## Implementation Steps

### 1. Database Migration — Create `appointments` table

Create migration: `backend/src/migrations/<timestamp>_create-appointments-table.sql`

```sql
CREATE TABLE appointments (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  psycho_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming', 'active', 'past')),
  google_meet_link TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON appointments (psycho_id, client_id);
```

### 2. Backend — `Appointment` model

Create `/Users/artem/uni/psycho/backend/src/features/appointments/models.ts`:

```typescript
export interface Appointment {
    id: string
    psychoId: string
    clientId: string
    startTime: string   // ISO 8601
    endTime: string     // ISO 8601
    status: 'upcoming' | 'active' | 'past'
    googleMeetLink: string | null
    createdAt: string
}
```

### 3. Backend — `appointments` service

Create `/Users/artem/uni/psycho/backend/src/features/appointments/services.ts`:

- `createAppointment(params: { psychoId, clientId, startTime, endTime, googleMeetLink? }): Promise<Appointment>` — INSERT and return record.
- `isClientLinkedAndActive(clientId, psychoId): Promise<boolean>` — check `psychologist_clients` where `disconnected_at IS NULL`.

### 4. Backend — `appointments` routes

Create `/Users/artem/uni/psycho/backend/src/features/appointments/routes.ts`:

`POST /` with `authorized, onlyPsychoRequest` middleware.

Request body:
```json
{ "startTime": "ISO", "endTime": "ISO", "generateGoogleMeet": true }
```

Validation:
- Missing `startTime` → `400 { error: 'BadRequest', message: 'startTime is required' }`
- Missing `endTime` → `400 { error: 'BadRequest', message: 'endTime is required' }`
- `endTime <= startTime` → `400 { error: 'BadRequest', message: 'endTime must be after startTime' }`
- Client not linked → `400 { error: 'ClientNotLinked', message: 'This client is not in your list.' }`

Success → `201 { appointment: Appointment }`.

### 5. Backend — Register routes

Modify `/Users/artem/uni/psycho/backend/src/config/app.ts`:

```typescript
app.route('/api/clients/:clientId/appointments', appointmentRoutes)
```

### 6. Frontend — `Appointment` model

Create `/Users/artem/uni/psycho/frontend/app/models/appointment.ts`:

```typescript
export interface Appointment {
    id: string
    clientId: string
    psychoId: string
    startTime: string
    endTime: string
    status: 'upcoming' | 'active' | 'past'
    googleMeetLink: string | null
    createdAt: string
}

export interface CreateAppointmentDTO {
    startTime: string
    endTime: string
    generateGoogleMeet: boolean
}
```

### 7. Frontend — `appointment.service.ts`

Create `/Users/artem/uni/psycho/frontend/app/services/appointment.service.ts`:

```typescript
export const appointmentService = {
    create: (clientId: string, data: CreateAppointmentDTO) =>
        api.post<{ appointment: Appointment }>(`/clients/${clientId}/appointments`, data),
    getList: (clientId: string) =>
        api.get<{ appointments: Appointment[] }>(`/clients/${clientId}/appointments`),
    getById: (clientId: string, appointmentId: string) =>
        api.get<{ appointment: Appointment }>(`/clients/${clientId}/appointments/${appointmentId}`),
}
```

### 8. Frontend — Update `SessionForm`

Modify `/Users/artem/uni/psycho/frontend/app/components/SessionForm.tsx`:

- Add `endTime` field to Zod schema with `endTime > startTime` refinement.
- Render `endTime` date+time picker.
- Replace `fakeClients` with real clients from `clientService.getList()`.
- Wire `onSubmit` to pass `startTime`, `endTime`, `generateGoogleMeet`.
- Rename UI labels from "Session" to "Appointment".

### 9. Frontend — Rename routes `sessions` → `appointments`

Modify `/Users/artem/uni/psycho/frontend/app/routes.ts`: rename all `sessions` segments to `appointments`.

Update all `Link` and `navigate` calls in:
- `client-sessions.tsx`
- `sessions.tsx`
- `session.tsx`
- `client-layout.tsx`

### 10. Frontend — Wire `client-sessions.tsx` to real API

Replace `fakeSessions` with `useEffect` calling `appointmentService.getList(clientId)`. Update status checks: `status === 'past'` / `status === 'upcoming'`. Update section labels to "Past Appointments" / "Upcoming Appointments".

### 11. Frontend — Wire `sessions.tsx` create flow

Wire `handleAddSession` to `appointmentService.create(clientId, data)` with loading/error states. Refetch list on success. Rename UI labels to "appointment".

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_create-appointments-table.sql` | DB migration |
| `backend/src/features/appointments/models.ts` | Backend `Appointment` interface |
| `backend/src/features/appointments/services.ts` | `createAppointment`, `isClientLinkedAndActive` |
| `backend/src/features/appointments/routes.ts` | `POST /` handler |
| `frontend/app/models/appointment.ts` | Frontend `Appointment` model |
| `frontend/app/services/appointment.service.ts` | Axios service wrapper |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Register `appointmentRoutes` |
| `frontend/app/routes.ts` | Rename `sessions` → `appointments` |
| `frontend/app/components/SessionForm.tsx` | Add `endTime`, real clients, rename labels |
| `frontend/app/routes/psychologist/client-sessions.tsx` | Wire real API, update status/labels |
| `frontend/app/routes/psychologist/sessions.tsx` | Wire create action |
| `frontend/app/routes/psychologist/session.tsx` | Update Link paths |
| `frontend/app/routes/psychologist/client-layout.tsx` | Update Link paths |

---

## Tests

### Backend

- `POST /api/clients/:clientId/appointments`:
  - Happy path → `201` with `{ appointment }` containing `status: 'upcoming'`, `googleMeetLink: null`
  - Missing `startTime` → `400 BadRequest`
  - Missing `endTime` → `400 BadRequest`
  - `endTime <= startTime` → `400 BadRequest`
  - Client not linked → `400 ClientNotLinked`
  - Unauthenticated → `401`
  - Client role → `403`

### Frontend

- `SessionForm`: renders `endTime` field, validates `endTime > startTime`, submits correctly.
- `client-sessions.tsx`: loading, data, empty state, error state; correct section labels.

---

## Out of Scope

- Google Calendar API / actual Meet link generation
- Email notifications
- Listing, editing, deleting appointments (EDG-18–20)
- Appointment detail views (EDG-21, EDG-22)
- Client-side views (EDG-23–25)
- Active state lifecycle (EDG-44)
- Full `session.ts` / `session.service.ts` removal
