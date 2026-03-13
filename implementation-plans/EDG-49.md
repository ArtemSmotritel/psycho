# Implementation Plan: EDG-49 — Client impressions per appointment (text, image, audio)

## Resolved Questions

1. **Shared table**: Impressions use the `attachments` table introduced in EDG-48 with `type='impression'`. No new migration needed — EDG-48 is a prerequisite.

2. **Media storage**: Same `/api/files/upload` infrastructure introduced in EDG-48. Images and audio stored as URLs in `image_urls`/`audio_urls`.

3. **Immutability**: Impressions are **append-only** — no `PATCH` or `DELETE` routes. This is enforced at the API level. The `updated_at` column exists in the shared table but is irrelevant for impressions.

4. **`name` field**: Not used for impressions — `name` is `NULL` for all impression rows. Validation does not require it.

5. **Appointment status**: Impressions can be submitted when appointment is `active` or `past`. Returns `400 AppointmentNotStarted` for `upcoming`.

6. **Visibility**: Impressions are visible to both parties. The client creates and reads via `/api/appointments/:appointmentId/impressions`; the psychologist reads via `/api/clients/:clientId/appointments/:appointmentId/impressions`.

7. **Access control decisions**: 404 always on unauthorized access. Full URL chain validated on every request. Past data accessible even after psychologist-client link removal.

---

## Access Control Rules

Violations always return `404`.

### Client impression routes (`/api/appointments/:appointmentId/impressions`)

**Step 1 — appointment ownership** (all routes):
- Fetch appointment by `appointmentId`.
- Verify `appointment.clientId === user.id`.
- If not found or check fails → `404`.

**Step 2 — status check** (`POST` only):
- If `appointment.status === 'upcoming'` → `400 AppointmentNotStarted`.

**Step 3 — attachment chain** (single-resource routes, if any are added later):
- Verify `attachment.appointmentId === appointmentId` AND `attachment.type === 'impression'` AND `attachment.authorId === user.id`.

**Additional edge cases:**
- A client cannot read another client's impressions — `listAttachmentsByAuthor(..., user.id)` enforces author scoping on `GET /`.
- Psychologists are blocked at the middleware level (`onlyClientRequest`) from all client impression routes.
- A client cannot access notes or recommendations via impression routes — type filter is always `'impression'`.
- Manipulating `appointmentId` to access another client's appointment is blocked by the ownership check.

### Psychologist impression read route (`/api/clients/:clientId/appointments/:appointmentId/impressions`)

**Step 1 — appointment ownership**:
- Fetch appointment by `appointmentId`.
- Verify `appointment.psychoId === user.id` AND `appointment.clientId === clientId` (URL param).
- If not found or check fails → `404`.

**Additional edge cases:**
- Psychologist can read all impressions for their appointments (all from the one client per appointment) — `listAttachments(..., 'impression')` without author filter.
- Manipulating `clientId` to spy on a different client's impressions is blocked by the appointment check.
- Clients are blocked by `onlyPsychoRequest` middleware.

---

## Overview

EDG-49 adds client impressions to appointments. An impression is an append-only entry (`type='impression'`) in the shared `attachments` table. The client can submit impressions during `active` or `past` appointments; the psychologist can read them. This ticket adds two route files to the existing `attachments` feature module (no new table or migration). The frontend gains an `impressionService`, `ImpressionForm`, `ImpressionList` components, and updates to `live-appointment.tsx` and `appointment-detail.tsx`.

**Prerequisite**: EDG-48 must be implemented first (creates `attachments` table, `attachments/services.ts`, file upload feature).

---

## Implementation Steps

### 1. Backend — Client Impression Routes

Create `backend/src/features/attachments/impressions-client-routes.ts`. A Hono router.

All routes: `authorized` + `onlyClientRequest`.

Every handler applies the **Client impression access control rules** defined above.

**`POST /`**
1. Step 1 (appointment ownership: `appointment.clientId === user.id`).
2. Step 2 (status: not `upcoming`).
3. Body: `{ text?: string, imageUrls?: string[], audioUrls?: string[] }`. Validate at least one field provided.
4. `createAttachment({ appointmentId, authorId: user.id, type: 'impression', name: null, text, imageUrls, audioUrls })`.
5. Returns `201 { impression: Attachment }`.

**`GET /`**
1. Step 1 (appointment ownership).
2. `listAttachmentsByAuthor(appointmentId, 'impression', user.id)` — client sees only their own impressions.
3. Returns `200 { impressions: Attachment[] }`.

Register in `backend/src/config/app.ts`:
```ts
import { impressionClientRoutes } from '../features/attachments/impressions-client-routes'
app.route('/api/appointments/:appointmentId/impressions', impressionClientRoutes)
```

---

### 2. Backend — Psychologist Impression Read Route

Create `backend/src/features/attachments/impressions-psycho-routes.ts`. A Hono router.

All routes: `authorized` + `onlyPsychoRequest`.

Every handler applies the **Psychologist impression access control rules** defined above.

**`GET /`**
1. Step 1 (appointment ownership: `appointment.psychoId === user.id` AND `appointment.clientId === clientId` URL param).
2. `listAttachments(appointmentId, 'impression')` — psychologist reads all impressions for the appointment.
3. Returns `200 { impressions: Attachment[] }`.

Register in `backend/src/config/app.ts`:
```ts
import { impressionPsychoRoutes } from '../features/attachments/impressions-psycho-routes'
app.route('/api/clients/:clientId/appointments/:appointmentId/impressions', impressionPsychoRoutes)
```

---

### 3. Backend — Tests

Create `backend/src/features/attachments/impressions-routes.test.ts`.

Follow the exact pattern from `backend/src/features/appointments/routes.test.ts`.

**`POST /api/appointments/:appointmentId/impressions`**
- Returns 201 with `type: 'impression'` when appointment is `active`.
- Returns 201 when appointment is `past`.
- Returns 400 `AppointmentNotStarted` when `upcoming`.
- Returns 400 when no content fields provided.
- Returns 404 when `appointmentId` does not belong to this client.
- Returns 404 when `appointmentId` belongs to a different client (IDOR attempt).
- Returns 401 unauthenticated.
- Returns 403 with psycho role header (blocked by `onlyClientRequest`).

**`GET /api/appointments/:appointmentId/impressions`**
- Returns 200 with only this client's impressions (not another psychologist's client's impressions).
- Returns 200 `[]` when client has submitted no impressions.
- Returns 404 when `appointmentId` does not belong to this client.
- Returns 401 unauthenticated.
- Returns 404 with psycho role header.

**`GET /api/clients/:clientId/appointments/:appointmentId/impressions`**
- Returns 200 with all impressions for the appointment.
- Returns 404 when `appointmentId` does not belong to this psychologist.
- Returns 404 when `clientId` URL param does not match the appointment's actual client.
- Returns 401 unauthenticated.
- Returns 403 with client role header (blocked by `onlyPsychoRequest`).

---

### 4. Frontend — DTOs

Add to `frontend/app/models/attachment.ts`:

```ts
export interface CreateImpressionDTO {
    text?: string
    imageUrls?: string[]
    audioUrls?: string[]
}
```

---

### 5. Frontend — Impression Service

Create `frontend/app/services/impression.service.ts`:

```ts
export const impressionService = {
    submit: (appointmentId: string, data: CreateImpressionDTO) =>
        api.post<{ impression: Attachment }>(`/appointments/${appointmentId}/impressions`, data),
    getClientList: (appointmentId: string) =>
        api.get<{ impressions: Attachment[] }>(`/appointments/${appointmentId}/impressions`),
    getPsychoList: (clientId: string, appointmentId: string) =>
        api.get<{ impressions: Attachment[] }>(`/clients/${clientId}/appointments/${appointmentId}/impressions`),
}
```

---

### 6. Frontend — `ImpressionForm` Component

Create `frontend/app/components/ImpressionForm.tsx`.

Props: `onSubmit: (text: string) => Promise<void>`, `isSubmitting: boolean`.

Renders a `Textarea` and "Submit" `Button`. Clears on successful submit. Shows loading state on button while `isSubmitting`.

---

### 7. Frontend — `ImpressionList` Component

Create `frontend/app/components/ImpressionList.tsx`.

Props: `impressions: Attachment[]`, `isLoading: boolean`.

Renders each impression's `text` and `createdAt` (formatted `'PPP HH:mm'`). Shows "No impressions yet." when empty and not loading. Shows spinner while loading.

---

### 8. Frontend — `live-appointment.tsx`

Modify `frontend/app/routes/client/live-appointment.tsx`.

Below the whiteboard section, add:
- Section heading "My Impressions".
- `<ImpressionList>` fed from state (fetched on mount via `impressionService.getClientList(appointmentId)`).
- `<ImpressionForm>` — on submit, calls `impressionService.submit(appointmentId, { text })`. On success, appends to local list. On error, shows toast.

---

### 9. Frontend — `appointment-detail.tsx`

Modify `frontend/app/routes/client/appointment-detail.tsx`.

Replace the `past` branch stub with a real past detail view:
- Date/time header + psychologist name (same format as `upcoming` branch).
- Google Meet alert block.
- "My Impressions" section: `<ImpressionList>` + `<ImpressionForm>` (impressions are allowed on past appointments per Decision 27).
- Loading/error states.

---

### 10. Frontend — `session.tsx` (psychologist read)

Modify `frontend/app/routes/psychologist/session.tsx`.

In the `past` branch, add a read-only impressions section below the notes panel:
- Fetch via `impressionService.getPsychoList(clientId, appointmentId)`.
- Render `<ImpressionList>` (no form — psychologist cannot submit impressions).
- Replace the `{/* TODO: EDG-49 — client impressions */}` placeholder added in EDG-48.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/features/attachments/impressions-client-routes.ts` | Client: `POST /` and `GET /` for impressions |
| `backend/src/features/attachments/impressions-psycho-routes.ts` | Psychologist: `GET /` for impressions |
| `backend/src/features/attachments/impressions-routes.test.ts` | Backend integration tests |
| `frontend/app/services/impression.service.ts` | Axios wrapper for impression API |
| `frontend/app/components/ImpressionForm.tsx` | Textarea + submit form |
| `frontend/app/components/ImpressionList.tsx` | Read-only list of impressions |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Register impression client and psycho routes |
| `frontend/app/models/attachment.ts` | Add `CreateImpressionDTO` |
| `frontend/app/routes/client/live-appointment.tsx` | Add impression form + list below whiteboard |
| `frontend/app/routes/client/appointment-detail.tsx` | Replace `past` stub with real view including impressions |
| `frontend/app/routes/psychologist/session.tsx` | Replace `{/* TODO: EDG-49 */}` with `ImpressionList` |

---

## Tests

**Backend** — see step 3 above.

**Frontend**

- `ImpressionForm`: renders textarea and submit button; disables both while `isSubmitting`; calls `onSubmit` with text; clears after success.
- `ImpressionList`: renders "No impressions yet." for empty; renders text + timestamp for each; shows spinner while loading.
- `live-appointment.tsx`: submit impression → new entry appears in list; error → toast shown.
- `appointment-detail.tsx` (past branch): renders impressions from API; submit form calls `impressionService.submit`.

---

## Out of Scope

- Editing or deleting impressions — append-only.
- Image/audio on impressions — can be submitted as URLs if files are pre-uploaded via `/api/files/upload`, but the `ImpressionForm` UI only exposes the text field.
- Psychologist submitting impressions — client-only.
- Full EDG-21/EDG-24 past appointment detail views — EDG-49 adds only the impressions section; other sections (notes, recommendations, snapshot) are separate tickets.
