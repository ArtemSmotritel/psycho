# Implementation Plan: EDG-50 — Psychologist recommendations per appointment (text, image, audio)

## Issues & Questions

1. **No file storage infrastructure exists.** The `fileService` on the frontend and a `POST /files/upload` route are referenced in existing code (e.g., `session-attachment.tsx`, `file.service.ts`), but neither a files table, file upload endpoint, nor an actual file storage backend (disk, S3, etc.) exists. Recommendations include images and audio. There are two options: (a) store files inline as base64 in the DB, (b) implement a file storage backend and reference URLs, or (c) defer media attachments (text-only for this ticket, media in a follow-up). The ticket description says "text, image, audio" but gives no detail on storage strategy. **This must be resolved before implementation.** This plan scopes media as file uploads stored on disk by the backend (Bun can serve static files), which is the simplest viable path for a thesis demo. A file upload endpoint and a minimal file table will be added.

2. **EDG-48 (psychologist notes) and EDG-49 (client impressions) are unimplemented.** Recommendations share the exact same data model as notes and impressions (text + image files + audio files, scoped to an appointment). There is no existing feature implementation to follow for the DB schema or service layer. This plan defines the schema from scratch, using a dedicated `recommendations` table (not a shared `appointment_attachments` table) to avoid blocking on EDG-48/49.

3. **Appointment state constraint for creating recommendations.** Decision 5 states that notes and impressions are creatable "during active or any past appointment." The same rule applies here: recommendations can be created during an **active** or any **past** appointment. The backend `POST` handler must enforce: status must be `active` or `past`. Return `400` if status is `upcoming`.

4. **Editing vs. immutability.** No design decision explicitly addresses whether recommendations can be edited or deleted. Notes (EDG-48) are described as "creatable/editable" in the ticket table. Impressions (EDG-49) are explicitly "no editing after submission." Recommendations have no stated immutability rule. This plan includes `PATCH` (edit text) and `DELETE` routes for recommendations, restricted to the psychologist, consistent with recommendations being a professional tool the psychologist controls. This should be confirmed.

5. **Email notification (EDG-56).** EDG-56 requires sending an email to the client when a psychologist creates a recommendation. That email ticket is a separate scope item. This plan includes a `// TODO: EDG-56 — send new recommendation email to client` comment in the POST route handler.

6. **Frontend display location.** The natural display locations are: (a) the past appointment detail view for the psychologist (`session.tsx` when `status === 'past'`, which currently shows a stub), and (b) the client's past appointment detail view (`appointment-detail.tsx` when `status === 'past'`, also a stub). This plan adds a recommendations section to those pages.

---

## Overview

EDG-50 adds psychologist recommendations to appointments. A new `recommendations` table stores each recommendation (title, body text, image file URLs, audio file URLs) scoped to a specific appointment. A file upload endpoint is added to support image and audio uploads. The backend exposes CRUD routes at `POST /api/clients/:clientId/appointments/:appointmentId/recommendations` and `GET/PATCH/DELETE /:recommendationId`, restricted to the psychologist. A separate read route `GET /api/appointments/:appointmentId/recommendations` is added for the client. The frontend gains a `recommendation.service.ts`, a `Recommendation` model, and two route updates: the psychologist's past appointment view (`session.tsx`) and the client's past appointment view (`appointment-detail.tsx`) each gain a recommendations section. The psychologist can create, edit, and delete recommendations; the client can only read them (reactions are EDG-51 scope).

---

## Implementation Steps

### 1. Database — create recommendations table migration

File: `backend/src/migrations/<timestamp>_create-recommendations-table.sql` (new)

Create with: `bun run migration:create -- --name create-recommendations-table`

Schema:
- `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()`
- `appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE`
- `psycho_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`
- `body TEXT` — optional text content
- `image_urls TEXT[] NOT NULL DEFAULT '{}'` — array of file paths
- `audio_urls TEXT[] NOT NULL DEFAULT '{}'` — array of file paths
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Add index: `CREATE INDEX ON recommendations (appointment_id)`.

### 2. Database — create files table and upload infrastructure migration

File: `backend/src/migrations/<timestamp>_create-files-table.sql` (new)

Create with: `bun run migration:create -- --name create-files-table`

The table tracks uploaded files:
- `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()`
- `original_name TEXT NOT NULL`
- `stored_name TEXT NOT NULL` — unique filename on disk
- `mime_type TEXT NOT NULL`
- `size INTEGER NOT NULL`
- `uploaded_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Also add `'files'` to `ALL_APP_TABLES` in `backend/src/test-fixtures/db.ts`.

### 3. Backend — models for recommendations

File: `backend/src/features/recommendations/models.ts` (new)

```typescript
export interface Recommendation {
    id: string
    appointmentId: string
    psychoId: string
    title: string
    body: string | null
    imageUrls: string[]
    audioUrls: string[]
    createdAt: string
    updatedAt: string
}
```

### 4. Backend — services for recommendations

File: `backend/src/features/recommendations/services.ts` (new)

Functions, following the pattern in `backend/src/features/appointments/services.ts` (raw SQL via `db` template literal, camelCase aliases in `RETURNING`):

- `createRecommendation(params: { appointmentId, psychoId, title, body?, imageUrls?, audioUrls? }): Promise<Recommendation>`
- `listRecommendationsForAppointment(appointmentId: string): Promise<Recommendation[]>` — no psycho filter, used by both psycho and client GET
- `findRecommendationById(id: string): Promise<Recommendation | null>`
- `updateRecommendation(id: string, params: { title?, body?, imageUrls?, audioUrls? }): Promise<Recommendation>`
- `deleteRecommendation(id: string): Promise<void>`

### 5. Backend — file upload feature

File: `backend/src/features/files/routes.ts` (new)

A new Hono router for file uploads, mounted at `/api/files`.

`POST /upload` — `authorized` middleware, accepts `multipart/form-data` with a `file` field. Validates file is present, generates a UUID-based `storedName`, writes to `./uploads/<storedName>` using `Bun.write`, inserts a row into the `files` table, returns `{ id, url: '/api/files/<storedName>', originalName, mimeType, size }`.

`GET /:filename` — no auth required. Reads the file from `./uploads/<filename>` using `Bun.file`, returns it with the correct `Content-Type` header. Returns `404` if file not found.

Register in `backend/src/config/app.ts`:
```typescript
app.route('/api/files', fileRoutes)
```

Create an `uploads/` directory at the backend root (add `.gitkeep`, add `uploads/*` to `.gitignore`).

### 6. Backend — recommendation routes (psychologist-side)

File: `backend/src/features/recommendations/psycho-routes.ts` (new)

A Hono router mounted at `/api/clients/:clientId/appointments/:appointmentId/recommendations`.

All routes use `authorized, onlyPsychoRequest`.

Shared pre-check: call `findAppointmentById(appointmentId)` and verify `psychoId === user.id && clientId === param clientId`. If null → `404`. If `upcoming` → `400 { error: 'AppointmentNotStarted', message: 'Recommendations can only be added to active or past appointments.' }`.

`GET /` — calls `listRecommendationsForAppointment(appointmentId)`, returns `{ recommendations }`.

`POST /` — validates `title` is present (else `400`). Calls `createRecommendation(...)`. Returns `201 { recommendation }`. Includes `// TODO: EDG-56 — send new recommendation email to client` comment.

`GET /:recommendationId` — calls `findRecommendationById(recommendationId)`. If null or `recommendation.appointmentId !== appointmentId` → `404`. Returns `{ recommendation }`.

`PATCH /:recommendationId` — same lookup. Merges fields. Calls `updateRecommendation(...)`. Returns `{ recommendation }`.

`DELETE /:recommendationId` — same lookup. Calls `deleteRecommendation(...)`. Returns `{ success: true }`.

Register in `backend/src/config/app.ts`:
```typescript
app.route('/api/clients/:clientId/appointments/:appointmentId/recommendations', psychoRecommendationRoutes)
```

### 7. Backend — recommendation routes (client-side)

File: `backend/src/features/recommendations/client-routes.ts` (new)

A Hono router mounted at `/api/appointments/:appointmentId/recommendations`.

Uses `authorized, onlyClientRequest`.

`GET /` — calls `findAppointmentByIdForClient(appointmentId, clientId)`. If null → `404`. Calls `listRecommendationsForAppointment(appointmentId)`. Returns `{ recommendations }`.

Register in `backend/src/config/app.ts`:
```typescript
app.route('/api/appointments/:appointmentId/recommendations', clientRecommendationRoutes)
```

### 8. Backend — tests

File: `backend/src/features/recommendations/routes.test.ts` (new)

Follow the exact pattern from `backend/src/features/appointments/routes.test.ts`: use `insertTestUser`, `asUser`, `linkClientToPsycho`, `createAppointment`, `startAppointment`, `endAppointment` as fixtures. See the Tests section below.

### 9. Frontend — Recommendation model

File: `frontend/app/models/recommendation.ts` (new)

```typescript
export interface Recommendation {
    id: string
    appointmentId: string
    psychoId: string
    title: string
    body: string | null
    imageUrls: string[]
    audioUrls: string[]
    createdAt: string
    updatedAt: string
}

export interface CreateRecommendationDTO {
    title: string
    body?: string
    imageUrls?: string[]
    audioUrls?: string[]
}

export interface UpdateRecommendationDTO {
    title?: string
    body?: string
    imageUrls?: string[]
    audioUrls?: string[]
}
```

### 10. Frontend — recommendation service

File: `frontend/app/services/recommendation.service.ts` (new)

Follow the pattern from `frontend/app/services/appointment.service.ts` (uses `api` from `./api`):

- `getForAppointment(clientId, appointmentId)` — `GET /clients/:clientId/appointments/:appointmentId/recommendations` (psychologist)
- `create(clientId, appointmentId, data: CreateRecommendationDTO)` — `POST` to same path
- `update(clientId, appointmentId, recommendationId, data: UpdateRecommendationDTO)` — `PATCH /:recommendationId`
- `delete(clientId, appointmentId, recommendationId)` — `DELETE /:recommendationId`
- `getForClientAppointment(appointmentId)` — `GET /appointments/:appointmentId/recommendations` (client)

### 11. Frontend — `RecommendationForm` component

File: `frontend/app/components/RecommendationForm.tsx` (new)

A Dialog-based form (following the pattern of `AttachmentForm.tsx`) for creating and editing recommendations. Uses `react-hook-form` + `zod`. Fields: `title` (required), `body` (optional textarea), image file uploads (via `fileService.upload`), audio recordings (via `useReactMediaRecorder` + `fileService.upload`).

On submit, images and audio are uploaded first via `fileService.upload` to get back URLs, then those URLs are included in the `CreateRecommendationDTO`.

Props: `mode: 'create' | 'edit'`, `trigger: React.ReactNode`, `initialData?: Partial<FormValues>`, `isLoading: boolean`, `onSubmit: (dto: CreateRecommendationDTO | UpdateRecommendationDTO) => void`.

### 12. Frontend — update `session.tsx` (psychologist past appointment view)

File: `frontend/app/routes/psychologist/session.tsx` (modify)

The `if (appointment.status === 'past')` branch currently returns `<p>This is a past appointment. Detail view coming in EDG-21.</p>`. Replace this stub with a real past appointment detail section that includes:

- Date/time header (same format as the upcoming branch).
- A "Recommendations" section showing a list of existing recommendations. Each item shows title, body preview, image/audio counts, and Edit/Delete actions (psychologist only).
- An "Add Recommendation" button that opens `RecommendationForm` in `create` mode.
- Use `useEffect` to fetch recommendations via `recommendationService.getForAppointment(clientId, appointmentId)` on mount.
- `useState` for `recommendations: Recommendation[]`, `isLoadingRecs: boolean`.

Editing: clicking Edit opens `RecommendationForm` in `edit` mode pre-filled with current data, calls `recommendationService.update(...)` on submit.

Deleting: wrapped in `ConfirmAction`, calls `recommendationService.delete(...)` on confirm.

### 13. Frontend — update `appointment-detail.tsx` (client past appointment view)

File: `frontend/app/routes/client/appointment-detail.tsx` (modify)

The `if (appointment.status === 'past')` branch currently returns `<p>This is a past appointment. Detail view coming in EDG-24.</p>`. Replace with a real past appointment detail section that includes:

- Date/time header (psychologist name as subtitle, same format as the upcoming branch).
- A "Recommendations" section showing the list of recommendations fetched via `recommendationService.getForClientAppointment(appointmentId)`.
- Each recommendation shows title, body, and image/audio playback (read-only). No edit/delete actions (reactions are EDG-51).
- `useState` for `recommendations: Recommendation[]`, `isLoadingRecs: boolean`.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<ts>_create-recommendations-table.sql` | New `recommendations` table |
| `backend/src/migrations/<ts>_create-files-table.sql` | New `files` table for uploaded file metadata |
| `backend/src/features/recommendations/models.ts` | `Recommendation` TypeScript interface |
| `backend/src/features/recommendations/services.ts` | Raw SQL queries for recommendations CRUD |
| `backend/src/features/recommendations/psycho-routes.ts` | Hono routes for psychologist recommendations |
| `backend/src/features/recommendations/client-routes.ts` | Hono routes for client reading recommendations |
| `backend/src/features/recommendations/routes.test.ts` | Integration tests for recommendation routes |
| `backend/src/features/files/routes.ts` | File upload and serve routes |
| `frontend/app/models/recommendation.ts` | `Recommendation`, `CreateRecommendationDTO`, `UpdateRecommendationDTO` interfaces |
| `frontend/app/services/recommendation.service.ts` | Axios calls wrapping recommendation API |
| `frontend/app/components/RecommendationForm.tsx` | Dialog form for create/edit recommendations |

---

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Register `psychoRecommendationRoutes`, `clientRecommendationRoutes`, and `fileRoutes` |
| `backend/src/test-fixtures/db.ts` | Add `'recommendations'` and `'files'` to `ALL_APP_TABLES` |
| `frontend/app/routes/psychologist/session.tsx` | Replace `past` branch stub with real recommendations list + create/edit/delete UI |
| `frontend/app/routes/client/appointment-detail.tsx` | Replace `past` branch stub with real recommendations read-only list |

---

## Tests

### What to test

**Backend**

- `POST /api/clients/:clientId/appointments/:appointmentId/recommendations`:
  - Happy path — active appointment → 201, returns recommendation with correct fields
  - Happy path — past appointment → 201
  - Upcoming appointment → 400 `AppointmentNotStarted`
  - Missing `title` → 400 `BadRequest`
  - Appointment not found → 404
  - Wrong role (client header) → 403
  - Unauthenticated → 401

- `GET /api/clients/:clientId/appointments/:appointmentId/recommendations`:
  - Happy path — returns list of recommendations for the appointment
  - Empty list when no recommendations exist → 200 with empty array
  - Appointment not found → 404

- `GET /api/clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId`:
  - Happy path — returns the recommendation
  - Not found (wrong ID) → 404
  - Recommendation belongs to a different appointment → 404

- `PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId`:
  - Happy path — updates title and body, returns updated recommendation
  - Recommendation not found → 404

- `DELETE /api/clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId`:
  - Happy path → 200 `{ success: true }`, row removed from DB
  - Not found → 404

- `GET /api/appointments/:appointmentId/recommendations` (client route):
  - Happy path — client can read recommendations for their own appointment
  - Appointment not belonging to this client → 404
  - Wrong role (psycho header) → 403

- `POST /api/files/upload`:
  - Happy path — returns URL and file metadata
  - Missing file field → 400

**Frontend**

- `RecommendationForm`:
  - Does not submit when `title` is empty (validation error shown)
  - Calls `onSubmit` with correct DTO when valid title provided
  - Shows "Create Recommendation" in create mode, "Edit Recommendation" in edit mode
  - Pre-populates fields in edit mode from `initialData`
  - Disables submit button while `isLoading` is true

- `session.tsx` past branch:
  - Renders recommendations list on mount (calls `recommendationService.getForAppointment`)
  - Shows empty state when list is empty
  - Calls `recommendationService.delete` and removes item from list on confirmed delete

- `appointment-detail.tsx` past branch:
  - Renders recommendations list fetched from `recommendationService.getForClientAppointment`
  - Shows read-only view (no edit/delete buttons present for client)

---

## Out of Scope

- **Client reactions to recommendations** — this is EDG-51 (done/not-done toggle + comment + psychologist reply).
- **EDG-56 email notification** — the `// TODO: EDG-56` comment is added but the email sending logic is not implemented.
- **Whiteboard snapshot display** on past appointment views — this is EDG-47.
- **Psychologist notes (EDG-48)** and **client impressions (EDG-49)** — separate tickets. The schema design here deliberately avoids a shared table to prevent blocking.
- **EDG-21 (full psychologist past appointment review)** and **EDG-24 (full client past appointment review)** — those tickets may later expand the past appointment views added here. The recommendations section added in steps 12 and 13 is additive and should not conflict.
- **File serving from CDN or S3** — files are stored on local disk in `./uploads/` for thesis demo purposes.
- **File deletion** — uploaded files are not garbage collected when a recommendation is deleted in this ticket.
