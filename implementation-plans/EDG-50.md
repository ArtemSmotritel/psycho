# Implementation Plan: EDG-50 — Psychologist recommendations per appointment (text, image, audio)

## Resolved Questions

1. **Shared table**: Recommendations use the `attachments` table introduced in EDG-48 with `type='recommendation'`. No new migration needed — EDG-48 is a prerequisite.

2. **File storage**: Reuses the `/api/files/upload` infrastructure from EDG-48.

3. **`name` field**: Required for recommendations (same as notes). Route-level validation enforces non-empty `name`.

4. **Editing**: Recommendations are editable by the psychologist (name + text only; media locked after creation) — same rule as notes.

5. **Appointment status**: Recommendations can be created when appointment is `active` or `past`. Returns `400 AppointmentNotActive` for `upcoming`.

6. **Visibility**: The psychologist creates and reads via `/api/clients/:clientId/appointments/:appointmentId/recommendations`. The client reads via `/api/appointments/:appointmentId/recommendations`. Reactions (EDG-51) are a separate concern.

7. **EDG-56 email**: A `// TODO: EDG-56 — send recommendation email to client` comment is added in the `POST` handler.

8. **Access control decisions**: 404 always on unauthorized access. Full URL chain validated on every request. Past data accessible even after psychologist-client link removal.

---

## Access Control Rules

Violations always return `404`.

### Psychologist recommendation routes (`/api/clients/:clientId/appointments/:appointmentId/recommendations`)

**Step 1 — appointment ownership** (all routes):
- Fetch appointment by `appointmentId`.
- Verify `appointment.psychoId === user.id` AND `appointment.clientId === clientId` (URL param).
- If not found or check fails → `404`.

**Step 2 — status check** (`POST` only):
- If `appointment.status === 'upcoming'` → `400 AppointmentNotActive`.

**Step 3 — attachment chain** (single-resource routes: `GET /:id`, `PATCH /:id`, `DELETE /:id`):
- Fetch attachment by `attachmentId`.
- Verify ALL of: `attachment.appointmentId === appointmentId` AND `attachment.type === 'recommendation'` AND `attachment.authorId === user.id`.
- If attachment not found or any check fails → `404`.

**Additional edge cases:**
- Clients are blocked by `onlyPsychoRequest` from all psychologist recommendation routes.
- A psychologist cannot access another psychologist's recommendations (`attachment.authorId === user.id`).
- A psychologist cannot access notes or impressions via recommendation routes (`type === 'recommendation'` check).
- Manipulating `clientId` in the URL to access another client's appointment data is blocked by the appointment check.

### Client recommendation read route (`/api/appointments/:appointmentId/recommendations`)

**Step 1 — appointment ownership**:
- Fetch appointment by `appointmentId`.
- Verify `appointment.clientId === user.id`.
- If not found or check fails → `404`.

**Additional edge cases:**
- Psychologists are blocked by `onlyClientRequest`.
- Client reads ALL recommendations for their appointment (no author filter — all recommendations from their assigned psychologist).
- A client cannot read recommendations from an appointment they are not part of.

---

## Overview

EDG-50 adds psychologist recommendations to appointments. Recommendations are stored as `type='recommendation'` rows in the shared `attachments` table (introduced in EDG-48). This ticket adds two route files to the existing `attachments` feature module — no new migration or services file needed beyond reusing what EDG-48 provides. The frontend gains a `recommendationService`, a `RecommendationForm` component, and updates to the psychologist past appointment view (`session.tsx`) and client past appointment view (`appointment-detail.tsx`).

**Prerequisites**: EDG-48 (creates `attachments` table and shared services).

---

## Implementation Steps

### 1. Backend — Psychologist Recommendation Routes

Create `backend/src/features/attachments/recommendations-psycho-routes.ts`. A Hono router.

All routes: `authorized` + `onlyPsychoRequest`.

Every handler applies the **Psychologist recommendation access control rules** defined above.

**`GET /`**
1. Step 1 (appointment ownership) only. Step 2 (status check) intentionally not applied — listing recommendations is allowed regardless of appointment status (unlike notes).
2. `listAttachmentsByAuthor(appointmentId, 'recommendation', user.id)`.
3. Returns `{ recommendations: Attachment[] }`.

**`POST /`**
1. Steps 1–2 (appointment ownership + status check).
2. Body: `{ name: string, text?: string, imageFileIds?: string[], audioFileIds?: string[] }`. Validate `name` non-empty → `400 BadRequest`.
3. `createAttachment({ appointmentId, authorId: user.id, type: 'recommendation', name, text, imageFileIds, audioFileIds })`.
4. Returns `201 { recommendation: Attachment }`.
5. `// TODO: EDG-56 — send recommendation email to client`.

**`GET /:attachmentId`**
1. Steps 1 + 3 (appointment ownership + full attachment chain: `appointmentId` match, `type === 'recommendation'`, `authorId === user.id`).
2. Returns `{ recommendation: Attachment }`.

**`PATCH /:attachmentId`**
1. Steps 1 + 3.
2. Body: `{ name?: string, text?: string }`. Media fields in body silently ignored.
3. `updateAttachment(attachmentId, { name, text })`.
4. Returns `{ recommendation: Attachment }`.

**`DELETE /:attachmentId`**
1. Steps 1 + 3.
2. `deleteAttachment(attachmentId)`.
3. Returns `{ success: true }`.

Register in `backend/src/config/app.ts`:
```ts
import { recommendationPsychoRoutes } from '../features/attachments/recommendations-psycho-routes'
app.route('/api/clients/:clientId/appointments/:appointmentId/recommendations', recommendationPsychoRoutes)
```

---

### 2. Backend — Client Recommendation Read Route

Create `backend/src/features/attachments/recommendations-client-routes.ts`. A Hono router.

All routes: `authorized` + `onlyClientRequest`.

Every handler applies the **Client recommendation read access control rules** defined above.

**`GET /`**
1. Step 1 (appointment ownership: `appointment.clientId === user.id`).
2. `listAttachments(appointmentId, 'recommendation')` — no author filter, client reads all recommendations for their appointment.
3. Returns `{ recommendations: Attachment[] }`.

Register in `backend/src/config/app.ts`:
```ts
import { recommendationClientRoutes } from '../features/attachments/recommendations-client-routes'
app.route('/api/appointments/:appointmentId/recommendations', recommendationClientRoutes)
```

---

### 3. Backend — Tests

Create `backend/src/features/attachments/recommendations-routes.test.ts`.

Follow the exact pattern from `backend/src/features/appointments/routes.test.ts`.

**`POST /api/clients/:clientId/appointments/:appointmentId/recommendations`**
- Returns 201 with `type: 'recommendation'` when appointment is `active`.
- Returns 201 when appointment is `past`.
- Returns 400 `AppointmentNotActive` when `upcoming`.
- Returns 400 `BadRequest` when `name` is missing.
- Returns 404 when `appointmentId` does not belong to this psychologist.
- Returns 404 when `clientId` URL param does not match the appointment's actual client.
- Returns 401 unauthenticated.
- Returns 403 with client role header (blocked by `onlyPsychoRequest`).

**`GET /api/clients/:clientId/appointments/:appointmentId/recommendations`**
- Returns 200 with only this psycho's recommendations (not another psycho's).
- Returns 200 `{ recommendations: [] }` when none exist.
- Returns 404 when `appointmentId` does not belong to this psychologist.
- Returns 404 when `clientId` does not match the appointment.
- Returns 404 with client role header.

**`PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId`**
- Returns 200 with updated name/text; `imageFileIds` in body is ignored (unchanged in response).
- Returns 404 when `attachmentId` belongs to a different appointment.
- Returns 404 when `attachmentId` has `type !== 'recommendation'`.
- Returns 404 when recommendation was created by a different psychologist.
- Returns 400 `AppointmentNotActive` when `upcoming`.
- Returns 404 with client role header.

**`DELETE /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId`**
- Returns 200 `{ success: true }`.
- Returns 404 when `attachmentId` belongs to a different appointment.
- Returns 404 when recommendation was created by a different psychologist.
- Returns 404 with client role header.

**`GET /api/appointments/:appointmentId/recommendations`**
- Returns 200 with all recommendations for this appointment.
- Returns 404 when `appointmentId` does not belong to this client.
- Returns 404 when client provides another client's `appointmentId`.
- Returns 403 with psycho role header (blocked by `onlyClientRequest`).

---

### 4. Frontend — DTOs

Add to `frontend/app/models/attachment.ts`:

```ts
export interface CreateRecommendationDTO {
    name: string
    text?: string
    imageFileIds?: string[]
    audioFileIds?: string[]
}

export interface UpdateRecommendationDTO {
    name?: string
    text?: string
    // no media fields
}
```

---

### 5. Frontend — Recommendation Service

Create `frontend/app/services/recommendation.service.ts`:

```ts
export const recommendationService = {
    getList: (clientId: string, appointmentId: string) =>
        api.get<{ recommendations: Attachment[] }>(`/clients/${clientId}/appointments/${appointmentId}/recommendations`),
    create: (clientId: string, appointmentId: string, data: CreateRecommendationDTO) =>
        api.post<{ recommendation: Attachment }>(`/clients/${clientId}/appointments/${appointmentId}/recommendations`, data),
    update: (clientId: string, appointmentId: string, id: string, data: UpdateRecommendationDTO) =>
        api.patch<{ recommendation: Attachment }>(`/clients/${clientId}/appointments/${appointmentId}/recommendations/${id}`, data),
    delete: (clientId: string, appointmentId: string, id: string) =>
        api.delete(`/clients/${clientId}/appointments/${appointmentId}/recommendations/${id}`),
    getClientList: (appointmentId: string) =>
        api.get<{ recommendations: Attachment[] }>(`/appointments/${appointmentId}/recommendations`),
}
```

---

### 6. Frontend — `RecommendationForm` Component

Create `frontend/app/components/RecommendationForm.tsx`.

A Dialog-based form (following the pattern of `AttachmentForm.tsx`) with fields: `name` (required text input), `body` (optional textarea), image file uploads, audio recordings. Uploads files via `fileService.upload(file)` before submit. In edit mode, media fields are disabled.

Props: `mode: 'create' | 'edit'`, `trigger: React.ReactNode`, `initialData?: { name: string; text?: string }`, `isLoading: boolean`, `onSubmit: (dto: CreateRecommendationDTO | UpdateRecommendationDTO) => void`.

---

### 7. Frontend — `session.tsx` (psychologist past appointment view)

Modify `frontend/app/routes/psychologist/session.tsx`.

Replace the `{/* TODO: EDG-50 — recommendations */}` placeholder with a recommendations section:
- Fetch via `recommendationService.getList(clientId, appointmentId)` on mount.
- Render list of recommendation cards (name, text preview, image/audio count).
- "Add Recommendation" button → `RecommendationForm` create mode → `recommendationService.create(...)` on submit.
- Edit action → `RecommendationForm` edit mode → `recommendationService.update(...)`.
- Delete action → `ConfirmAction` → `recommendationService.delete(...)`.

---

### 8. Frontend — `appointment-detail.tsx` (client past appointment view)

Modify `frontend/app/routes/client/appointment-detail.tsx`.

Add a read-only recommendations section to the `past` branch (alongside the impressions section from EDG-49):
- Fetch via `recommendationService.getClientList(appointmentId)` on mount.
- Render each recommendation's `name`, `text`, image/audio playback (read-only, no edit/delete).
- Reactions (EDG-51) will add interactive controls on top of this.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/features/attachments/recommendations-psycho-routes.ts` | Psychologist CRUD routes for recommendations |
| `backend/src/features/attachments/recommendations-client-routes.ts` | Client read route for recommendations |
| `backend/src/features/attachments/recommendations-routes.test.ts` | Backend integration tests |
| `frontend/app/services/recommendation.service.ts` | Axios wrapper for recommendation API |
| `frontend/app/components/RecommendationForm.tsx` | Dialog form for create/edit |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Register recommendation psycho and client routes |
| `frontend/app/models/attachment.ts` | Add `CreateRecommendationDTO`, `UpdateRecommendationDTO` |
| `frontend/app/routes/psychologist/session.tsx` | Replace `{/* TODO: EDG-50 */}` with recommendations CRUD section |
| `frontend/app/routes/client/appointment-detail.tsx` | Add read-only recommendations section to `past` branch |

---

## Out of Scope

- Client reactions to recommendations — EDG-51.
- EDG-56 email notification — `// TODO: EDG-56` comment added only.
- File deletion when recommendation is deleted.
- Pagination.
