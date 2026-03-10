# Implementation Plan: EDG-18 — Psycho can change an appointment

## Issues & Questions

1. **Email notification scope.** Decision 12 states the client receives an email when an appointment is rescheduled. EDG-58 is the dedicated email ticket. The mailer service does not yet exist. The backend handler will have a `// TODO: EDG-58` comment at the trigger site; actual sending is deferred.

2. **Which fields are editable.** `startTime`, `endTime`, and `googleMeetLink` — all optional in the PATCH body. The `generateGoogleMeet` flag remains `disabled={mode === 'edit'}`.

3. **Guard: only `upcoming` appointments can be changed.** Editing a `past` or `active` appointment must be rejected with `400 AppointmentNotEditable`.

4. **Ownership guard.** The route must verify the appointment belongs to the authenticated psychologist AND the `clientId` from the URL.

5. **`session.tsx` still uses fake data.** Full detail-view wiring is EDG-22. For EDG-18, only the edit form's `onSubmit` callback needs to call the real update API.

6. **`SessionForm` edit mode has no `googleMeetLink` field.** Add a text input for this field in edit mode only.

---

## Overview

EDG-18 adds the ability for a psychologist to edit an existing upcoming appointment. Involves: (1) `findAppointmentById` and `updateAppointment` service functions; (2) `PATCH /:appointmentId` handler in appointments routes; (3) `UpdateAppointmentDTO` type and `update` method on frontend `appointmentService`; (4) `googleMeetLink` field and `isLoading` prop added to `SessionForm` for edit mode; (5) wiring the stubbed edit action in `session.tsx` to the real API with `sonner` toasts.

---

## Implementation Steps

### 1. Backend — Add `findAppointmentById` and `updateAppointment` to `services.ts`

Modify `/Users/artem/uni/psycho/backend/src/features/appointments/services.ts`.

Add `findAppointmentById(appointmentId: string, psychoId: string, clientId: string): Promise<Appointment | null>` — SELECT from `appointments WHERE id = $1 AND psycho_id = $2 AND client_id = $3`. Returns `null` when no row found.

Add `updateAppointment(appointmentId: string, params: { startTime: string; endTime: string; googleMeetLink: string | null }): Promise<Appointment>` — UPDATE with full merged values and RETURNING with same column aliases as `createAppointment`.

### 2. Backend — Add `PATCH /:appointmentId` handler to `routes.ts`

Modify `/Users/artem/uni/psycho/backend/src/features/appointments/routes.ts`.

Add `.patch('/:appointmentId', async (c) => { ... })`. `clientId` from `c.req.param('clientId')`, `appointmentId` from `c.req.param('appointmentId')`.

Processing order:
1. Parse body: `{ startTime?, endTime?, googleMeetLink? }`.
2. `findAppointmentById(appointmentId, user.id, clientId)` → if `null` → `404 { error: 'NotFound' }`.
3. If `existing.status !== 'upcoming'` → `400 { error: 'AppointmentNotEditable', message: 'Only upcoming appointments can be edited.' }`.
4. Merge: `mergedStart = body.startTime ?? existing.startTime`, `mergedEnd = body.endTime ?? existing.endTime`, `mergedLink = 'googleMeetLink' in body ? body.googleMeetLink : existing.googleMeetLink`.
5. If `new Date(mergedEnd) <= new Date(mergedStart)` → `400 { error: 'BadRequest', message: 'endTime must be after startTime' }`.
6. `updateAppointment(appointmentId, { startTime: mergedStart, endTime: mergedEnd, googleMeetLink: mergedLink })`.
7. `// TODO: EDG-58 — send rescheduled email to client if startTime or endTime changed`.
8. Return `200 { appointment }`.

### 3. No migration needed

The `appointments` table already has all required columns.

### 4. Backend Tests — Extend `routes.test.ts`

Modify `/Users/artem/uni/psycho/backend/src/features/appointments/routes.test.ts`.

Add:
- `describe('PATCH /api/clients/:clientId/appointments/:appointmentId', ...)` — see Tests section.
- `describe('updateAppointment service (unit)', ...)`.
- `describe('findAppointmentById service (unit)', ...)`.

### 5. Frontend — Add `UpdateAppointmentDTO` to `appointment.ts`

Modify `/Users/artem/uni/psycho/frontend/app/models/appointment.ts`:

```typescript
export interface UpdateAppointmentDTO {
    startTime?: string
    endTime?: string
    googleMeetLink?: string | null
}
```

### 6. Frontend — Add `update` method to `appointment.service.ts`

Modify `/Users/artem/uni/psycho/frontend/app/services/appointment.service.ts`:

```typescript
update: (clientId: string, appointmentId: string, data: UpdateAppointmentDTO) =>
    api.patch<{ appointment: Appointment }>(`/clients/${clientId}/appointments/${appointmentId}`, data),
```

### 7. Frontend — Add `googleMeetLink` field and `isLoading` prop to `SessionForm`

Modify `/Users/artem/uni/psycho/frontend/app/components/SessionForm.tsx`:

- Add `googleMeetLink: z.string().optional()` to Zod schema.
- Render a plain text `<Input>` for `googleMeetLink` only when `mode === 'edit'`. Label: "Google Meet Link (optional)".
- Add optional `isLoading?: boolean` prop; pass to submit `<Button disabled={isLoading}>`. Show "Saving…" or spinner when loading.

### 8. Frontend — Wire "Edit Session" in `session.tsx` to real API

Modify `/Users/artem/uni/psycho/frontend/app/routes/psychologist/session.tsx`:

- Add `const [isUpdating, setIsUpdating] = useState(false)`.
- Replace stubbed `onSubmit` with async handler:
  1. `setIsUpdating(true)`.
  2. Build DTO: convert `values.startTime`/`endTime` via `.toISOString()`, include `googleMeetLink: values.googleMeetLink || null`.
  3. `await appointmentService.update(session.clientId, session.id, dto)`.
  4. On success: `toast.success('Appointment updated.')`.
  5. On error: `toast.error('Failed to update appointment. Please try again.')`.
  6. `finally`: `setIsUpdating(false)`.
- Pass `isLoading={isUpdating}` to the edit `SessionForm`.

### 9. Frontend Tests

Create `/Users/artem/uni/psycho/frontend/app/test/session-update.test.tsx` covering:
- Submitting the edit form calls `appointmentService.update` with correct args and ISO-string times.
- Success shows `toast.success`.
- API error shows `toast.error`.
- Submit button disabled while updating.

---

## Files to Create

| Path | Description |
|------|-------------|
| `frontend/app/test/session-update.test.tsx` | Frontend tests for edit appointment flow |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/services.ts` | Add `findAppointmentById`, `updateAppointment` |
| `backend/src/features/appointments/routes.ts` | Add `PATCH /:appointmentId` handler |
| `backend/src/features/appointments/routes.test.ts` | Add PATCH tests and service unit tests |
| `frontend/app/models/appointment.ts` | Add `UpdateAppointmentDTO` |
| `frontend/app/services/appointment.service.ts` | Add `update` method |
| `frontend/app/components/SessionForm.tsx` | Add `googleMeetLink` field for edit mode; add `isLoading` prop |
| `frontend/app/routes/psychologist/session.tsx` | Wire edit `onSubmit` to real API; add loading/toast |

---

## Tests

### Backend

- `PATCH /api/clients/:clientId/appointments/:appointmentId`:
  - Happy path → `200` with updated `{ appointment }`.
  - Appointment not found → `404 NotFound`.
  - Status `past` → `400 AppointmentNotEditable`.
  - Status `active` → `400 AppointmentNotEditable`.
  - `endTime` before effective `startTime` → `400 BadRequest`.
  - Unauthenticated → `401`.
  - Client role → `403`.

- `updateAppointment` service (unit): returns updated appointment with new times and link.
- `findAppointmentById` service (unit): returns appointment on match; `null` on wrong id/psychoId/clientId.

### Frontend

- `session.tsx` edit flow: calls `appointmentService.update` with correct args; shows `toast.success`; shows `toast.error` on failure; button disabled while loading.

---

## Out of Scope

- Sending reschedule email (EDG-58 — comment placed, mailer not implemented).
- Full detail view wiring (EDG-22).
- Deleting appointments (EDG-19).
- Listing appointments (EDG-20).
- Client-side views (EDG-23–25).
- Active appointment lifecycle (EDG-44).
- Google Calendar API integration.
