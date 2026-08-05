# Implementation Plan: EDG-48 — Psychologist Notes per Appointment (text, image, audio)

## Resolved Questions

1. **File storage**: Disk + `/api/files` endpoint implemented in this ticket. Files saved to `./uploads/`, served via `GET /api/files/:filename`. Audio and images both stored as binary files, referenced by URL in `image_urls`/`audio_urls`.

2. **Note `name` field**: `name` is **required** — `name TEXT NOT NULL` in the DB.

3. **Editing**: Notes are editable (name + text only). Media (`image_urls`, `audio_urls`) is locked after creation — `PATCH` ignores media fields at the API level; media fields are disabled in the frontend edit form.

4. **Shared table**: All attachment types (notes, impressions, recommendations) share a single `attachments` table with a `type TEXT NOT NULL CHECK (type IN ('note', 'impression', 'recommendation'))` column. EDG-48 introduces this table; EDG-49 and EDG-50 add their own routes on top of it without new migrations.

5. **Appointment status constraint**: Notes are only accessible when appointment is `active` or `past`. Returns `400 AppointmentNotActive` for `upcoming`. Note: EDG-50 (recommendations) uses a different error name `AppointmentNotStarted` for the same concept — this is an inconsistency between plans but both work correctly in isolation.

6. **Access control decisions**: 404 always (never 403) when access is denied — do not reveal resource existence to unauthorized callers. Past appointment data remains accessible even if the psychologist-client link is later removed. Full URL chain is validated on every request: `clientId → appointmentId → attachmentId` must all be consistently owned by / linked to the authenticated user. `attachmentId` mismatch with `appointmentId` returns 404.

---

## Access Control Rules

These rules apply to **every** route handler in the notes feature. Violations always return `404` (never `403`).

### Psychologist notes routes (`/api/clients/:clientId/appointments/:appointmentId/notes`)

**Step 1 — appointment ownership** (all routes):
- Fetch the appointment by `appointmentId`.
- Verify `appointment.psychoId === user.id` AND `appointment.clientId === clientId` (URL param).
- If appointment not found or either check fails → `404`.

**Step 2 — status check** (all routes):
- If `appointment.status === 'upcoming'` → `400 AppointmentNotActive`.

**Step 3 — attachment chain** (single-resource routes: `GET /:id`, `PATCH /:id`, `DELETE /:id`):
- Fetch attachment by `attachmentId`.
- Verify ALL of: `attachment.appointmentId === appointmentId` AND `attachment.type === 'note'` AND `attachment.authorId === user.id`.
- If attachment not found or any check fails → `404`.

**Additional edge cases:**
- Clients are blocked at the middleware level (`onlyPsychoRequest`) — they cannot access notes routes at all.
- A psychologist cannot access another psychologist's notes even on the same appointment (`attachment.authorId === user.id` check).
- A psychologist cannot access impressions or recommendations via notes routes (`attachment.type === 'note'` check).
- Manipulating `clientId` in the URL to access another client's data is blocked by the appointment ownership check.

---

## Overview

EDG-48 introduces three foundational pieces:

1. **`attachments` table** — a single unified table for all appointment-scoped content (notes, impressions, recommendations), distinguished by a `type` column. Only this ticket creates the migration; EDG-49 and EDG-50 add routes that write to the same table.
2. **File upload infrastructure** — `POST /api/files/upload` + `GET /api/files/:filename`, shared by all attachment types and future features.
3. **Notes feature** — psychologist-private notes on appointments. CRUD routes under `/api/clients/:clientId/appointments/:appointmentId/notes`, using `type='note'` filter. UI panel on the live appointment view and past appointment detail view.

---

## Implementation Steps

### 1. Database Migrations

**a) Files table** — `backend/src/migrations/<timestamp>_create-files-table.sql`:

```sql
CREATE TABLE files (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name TEXT NOT NULL,
    stored_name   TEXT NOT NULL UNIQUE,
    mime_type     TEXT NOT NULL,
    size          BIGINT NOT NULL,
    uploaded_by   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**b) Attachments table** — `backend/src/migrations/<timestamp>_create-attachments-table.sql`:

```sql
CREATE TABLE attachments (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    author_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN ('note', 'impression', 'recommendation')),
    name           TEXT,
    text           TEXT,
    image_urls     TEXT[] NOT NULL DEFAULT '{}',
    audio_urls     TEXT[] NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON attachments (appointment_id, type);
CREATE INDEX ON attachments (author_id);
```

`name` is nullable at the DB level (impressions don't use it). Route-level validation enforces `name` is required for `note` and `recommendation` types.

Add `'files'` and `'attachments'` to `ALL_APP_TABLES` in `backend/src/test-fixtures/db.ts`.

Create `backend/uploads/` directory: add `.gitkeep`, add `uploads/*` (except `.gitkeep`) to `backend/.gitignore`.

---

### 2. Backend — File Upload Feature

Create `backend/src/features/files/routes.ts`. A Hono router mounted at `/api/files`.

**`POST /upload`** — guard: `authorized`. Accepts `multipart/form-data` with a `file` field. Parse the body with `c.req.parseBody()` (not `c.req.json()`).
- Returns `400 BadRequest` if no file.
- Generates `storedName` = `<uuid>.<ext>` (preserve extension from original filename).
- `Bun.write('./uploads/' + storedName, await file.arrayBuffer())`. **Note**: `./uploads/` is relative to the server's CWD; the server must be started from the `backend/` directory (standard `bun run dev` does this).
- Inserts row into `files` table.
- Returns `201 { id, url: '/api/files/<storedName>', originalName, mimeType, size, uploadedAt }`.

**Note on response shape**: The existing frontend `FileUploadResponse` model (`frontend/app/models/file.ts`) uses `{ id, url, name, size, type, uploadedAt }`. The backend must return a merged shape `{ id, url, originalName, mimeType, size, uploadedAt }` and the frontend model must be updated to match (see Files to Modify).

**`GET /:filename`** — no auth. Serves `./uploads/<filename>` via `Bun.file` with correct `Content-Type`. The path `./uploads/<filename>` is also relative to CWD. Returns `404` if not found.

Register in `backend/src/config/app.ts`:
```ts
import { fileRoutes } from '../features/files/routes'
app.route('/api/files', fileRoutes)
```

---

### 3. Backend — Shared Attachment Models

Create `backend/src/features/attachments/models.ts`:

```ts
export type AttachmentType = 'note' | 'impression' | 'recommendation'

export interface Attachment {
    id: string
    appointmentId: string
    authorId: string
    type: AttachmentType
    name: string | null
    text: string | null
    imageUrls: string[]
    audioUrls: string[]
    createdAt: string
    updatedAt: string
}
```

---

### 4. Backend — Shared Attachment Services

Create `backend/src/features/attachments/services.ts`. All functions use `db` from `config/db`.

```ts
createAttachment(params: {
    appointmentId: string
    authorId: string
    type: AttachmentType
    name?: string | null
    text?: string | null
    imageUrls?: string[]
    audioUrls?: string[]
}): Promise<Attachment>
// INSERT INTO attachments (...) RETURNING all fields with camelCase aliases

listAttachments(appointmentId: string, type: AttachmentType): Promise<Attachment[]>
// SELECT ... WHERE appointment_id = $1 AND type = $2 ORDER BY created_at ASC

listAttachmentsByAuthor(appointmentId: string, type: AttachmentType, authorId: string): Promise<Attachment[]>
// SELECT ... WHERE appointment_id = $1 AND type = $2 AND author_id = $3 ORDER BY created_at ASC

findAttachmentById(id: string): Promise<Attachment | null>
// SELECT ... WHERE id = $1

updateAttachment(id: string, params: { name?: string | null; text?: string | null }): Promise<Attachment>
// UPDATE attachments SET name = COALESCE($name, name), text = COALESCE($text, text),
//   updated_at = NOW() WHERE id = $1 RETURNING ...
// Media fields intentionally excluded.
// Note: COALESCE means passing null/undefined for a field keeps the existing value —
// clearing a field back to null is not supported. This is intentional for thesis scope.

deleteAttachment(id: string): Promise<void>
// DELETE FROM attachments WHERE id = $1
```

---

### 5. Backend — Notes Routes

Create `backend/src/features/attachments/notes-routes.ts`. A Hono router.

All routes: `authorized` + `onlyPsychoRequest`.

Every handler applies the **Access Control Rules** defined above before any business logic.

**`GET /`**
1. Steps 1–2 (appointment ownership + status check). **Note**: Step 2 intentionally applies to GET — an upcoming appointment logically has no notes, so `400 AppointmentNotActive` is returned rather than an empty list. This is a conservative guard that prevents psychologists from accessing the notes panel before a session starts.
2. `listAttachmentsByAuthor(appointmentId, 'note', user.id)`.
3. Returns `{ notes: Attachment[] }`.

**`POST /`**
1. Steps 1–2.
2. Body: `{ name: string, text?: string, imageUrls?: string[], audioUrls?: string[] }`. Validate `name` non-empty → `400 BadRequest` if missing.
3. `createAttachment({ appointmentId, authorId: user.id, type: 'note', name, text, imageUrls, audioUrls })`.
4. Returns `201 { note: Attachment }`.

**`GET /:attachmentId`**
1. Steps 1–3 (full chain: appointment + status + attachment ownership/type).
2. Returns `{ note: Attachment }`.

**`PATCH /:attachmentId`**
1. Steps 1–3.
2. Body: `{ name?: string, text?: string }`. Any `imageUrls`/`audioUrls` fields silently ignored.
3. `updateAttachment(attachmentId, { name, text })`.
4. Returns `{ note: Attachment }`.

**`DELETE /:attachmentId`**
1. Steps 1–3.
2. `deleteAttachment(attachmentId)`.
3. Returns `{ success: true }`.

Register in `backend/src/config/app.ts`:
```ts
import { noteRoutes } from '../features/attachments/notes-routes'
app.route('/api/clients/:clientId/appointments/:appointmentId/notes', noteRoutes)
```

---

### 6. Backend — Tests

Create `backend/src/features/attachments/notes-routes.test.ts`.

Follow the exact pattern from `backend/src/features/appointments/routes.test.ts`: use `insertTestUser`, `asUser`, `linkClientToPsycho`, `createAppointment`, `startAppointment`, `endAppointment` fixtures. See Tests section.

---

### 7. Frontend — Shared Attachment Model

Create `frontend/app/models/attachment.ts`:

```ts
export type AttachmentType = 'note' | 'impression' | 'recommendation'

export interface Attachment {
    id: string
    appointmentId: string
    authorId: string
    type: AttachmentType
    name: string | null
    text: string | null
    imageUrls: string[]
    audioUrls: string[]
    createdAt: string
    updatedAt: string
}

export interface CreateNoteDTO {
    name: string
    text?: string
    imageUrls?: string[]
    audioUrls?: string[]
}

export interface UpdateNoteDTO {
    name?: string
    text?: string
    // no media fields — locked after creation
}
```

---

### 8. Frontend — Notes Service

Create `frontend/app/services/note.service.ts`. Follow pattern from `appointment.service.ts`.

```ts
export const noteService = {
    getList:  (clientId, appointmentId) =>
        api.get<{ notes: Attachment[] }>(`/clients/${clientId}/appointments/${appointmentId}/notes`),
    create:   (clientId, appointmentId, data: CreateNoteDTO) =>
        api.post<{ note: Attachment }>(`/clients/${clientId}/appointments/${appointmentId}/notes`, data),
    getById:  (clientId, appointmentId, noteId) =>
        api.get<{ note: Attachment }>(`/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`),
    update:   (clientId, appointmentId, noteId, data: UpdateNoteDTO) =>
        api.patch<{ note: Attachment }>(`/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`, data),
    delete:   (clientId, appointmentId, noteId) =>
        api.delete(`/clients/${clientId}/appointments/${appointmentId}/notes/${noteId}`),
}
```

---

### 9. Frontend — Extend `AttachmentForm` for Edit Mode

Modify `frontend/app/components/AttachmentForm.tsx`.

The existing component only supports create mode. Add edit mode support:
- Add `mode: 'create' | 'edit'` prop (default `'create'`).
- In `edit` mode: disable voice recording button and image upload button/input.
- Change submit button label to `"Save {type}"` when `mode === 'edit'` (currently always `"Create {type}"`).
- The existing `initialData` prop is used to pre-populate `name` and `text` in edit mode.

Updated interface:
```ts
interface AttachmentFormProps {
    type: AttachmentType
    mode?: 'create' | 'edit'   // default 'create'
    trigger: React.ReactNode
    initialData?: Partial<FormValues>
    onSubmit: (values: FormValues) => void
}
```

---

### 10. Frontend — `AppointmentNotesPanel` Component

Create `frontend/app/components/AppointmentNotesPanel.tsx`.

Props: `clientId: string`, `appointmentId: string`.

Behavior:
- Fetches notes on mount via `noteService.getList(...)`. Shows `<p>Loading notes...</p>` while loading; shows error message on failure.
- Lists notes, each showing: `name` (bold), `text` (if any), image count, audio count, formatted `createdAt`.
- "Add Note" button opens `AttachmentForm` in create mode (`mode="create"`, `type="note"`). On submit: uploads any `imageFiles`/`voiceFiles` via `fileService.upload(file)` to get URLs, then calls `noteService.create(...)`. Refreshes list on success.
- Each note card: "Edit" action opens `AttachmentForm` in edit mode (`mode="edit"`, pre-populated with `name` and `text`). Voice/image inputs are disabled. On submit calls `noteService.update(...)`. Refreshes list on success.
- Each note card: "Delete" action wrapped in `ConfirmAction`. On confirm calls `noteService.delete(...)`. Refreshes list on success.

`AttachmentForm` mapping: form `name` → `CreateNoteDTO.name`, `text` → `CreateNoteDTO.text`, `voiceFiles` → `fileService.upload` each → `audioUrls`, `imageFiles` → `fileService.upload` each → `imageUrls`.

---

### 11. Frontend — Psychologist Past Appointment Detail View

Modify `frontend/app/routes/psychologist/session.tsx`.

Replace the `past` branch stub (`<p>This is a past appointment. Detail view coming in EDG-21.</p>`) with:
- Date/time header (same format as `upcoming` branch).
- `<AppointmentNotesPanel clientId={clientId} appointmentId={appointment.id} />` (`clientId` comes from `useParams`, `appointment.id` from `useCurrentAppointment`).
- `{/* TODO: EDG-47 — whiteboard snapshot */}`
- `{/* TODO: EDG-49 — client impressions */}`
- `{/* TODO: EDG-50 — recommendations */}`

---

### 12. Frontend — Live Appointment Notes Panel

Modify `frontend/app/routes/psychologist/live-session.tsx`.

**Prerequisite**: Install the shadcn Collapsible component first: `bunx shadcn add collapsible`.

Add `<AppointmentNotesPanel clientId={clientId!} appointmentId={appointmentId!} />` below the whiteboard section, wrapped in a shadcn/ui `Collapsible` so the psychologist can hide it.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<ts>_create-files-table.sql` | `files` table for uploaded file metadata |
| `backend/src/migrations/<ts>_create-attachments-table.sql` | Unified `attachments` table with `type` column |
| `backend/src/features/files/routes.ts` | `POST /upload` and `GET /:filename` |
| `backend/src/features/attachments/models.ts` | `Attachment` interface and `AttachmentType` union |
| `backend/src/features/attachments/services.ts` | Shared CRUD functions: `createAttachment`, `listAttachments`, `listAttachmentsByAuthor`, `findAttachmentById`, `updateAttachment`, `deleteAttachment` |
| `backend/src/features/attachments/notes-routes.ts` | Psycho-only notes routes (type='note') |
| `backend/src/features/attachments/notes-routes.test.ts` | Backend integration tests for notes routes |
| `frontend/app/models/attachment.ts` | `Attachment`, `AttachmentType`, `CreateNoteDTO`, `UpdateNoteDTO` |
| `frontend/app/services/note.service.ts` | Axios wrapper for notes API |
| `frontend/app/components/AppointmentNotesPanel.tsx` | Notes CRUD panel |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Register `fileRoutes` at `/api/files` and `noteRoutes` at `/api/clients/:clientId/appointments/:appointmentId/notes` |
| `backend/src/test-fixtures/db.ts` | Add `'attachments'` and `'files'` to `ALL_APP_TABLES` |
| `frontend/app/models/file.ts` | Update `FileUploadResponse` to `{ id, url, originalName, mimeType, size, uploadedAt }` |
| `frontend/app/components/AttachmentForm.tsx` | Add `mode: 'create' \| 'edit'` prop; disable media inputs in edit mode; change submit label |
| `frontend/app/routes/psychologist/session.tsx` | Replace `past` stub with real detail view + `AppointmentNotesPanel` |
| `frontend/app/routes/psychologist/live-session.tsx` | Install Collapsible component; add collapsible `AppointmentNotesPanel` below whiteboard |

## Files to Delete

| Path | Reason |
|------|--------|
| `frontend/app/services/attachment.service.ts` | Stale stub that imports `Attachment` from `~/models/session` (a different type). Replaced by `note.service.ts` and future per-type service files. |

---

## Tests

**Backend** (`notes-routes.test.ts`)

- `GET /api/clients/:clientId/appointments/:appointmentId/notes`:
  - Happy path — past appointment, returns only this psycho's notes (not another psycho's notes on the same appointment).
  - Returns `{ notes: [] }` when no notes exist.
  - Returns `403` with client role header (route blocked by `onlyPsychoRequest`).
  - Returns `401` unauthenticated.
  - Returns `404` when `appointmentId` does not belong to this psychologist.
  - Returns `404` when `clientId` URL param does not match the appointment's actual client.
  - Returns `400 AppointmentNotActive` when `upcoming`.

- `POST /api/clients/:clientId/appointments/:appointmentId/notes`:
  - Happy path — active appointment, creates note with `name`.
  - Happy path — past appointment, creates note with `imageUrls`.
  - Returns `400 BadRequest` when `name` is missing.
  - Returns `400 AppointmentNotActive` when `upcoming`.
  - Returns `403` with client role header.
  - Returns `401` unauthenticated.
  - Returns `404` when appointment does not belong to this psychologist.

- `GET /api/clients/:clientId/appointments/:appointmentId/notes/:attachmentId`:
  - Happy path — returns `{ note: Attachment }` for a note owned by this psychologist.
  - Returns `404` when `attachmentId` belongs to a different appointment.
  - Returns `404` when `attachmentId` has `type !== 'note'` (e.g. an impression ID).
  - Returns `404` when note was created by a different psychologist.
  - Returns `400 AppointmentNotActive` when `upcoming`.
  - Returns `403` with client role header.
  - Returns `401` unauthenticated.

- `PATCH /api/clients/:clientId/appointments/:appointmentId/notes/:attachmentId`:
  - Happy path — updates `name` and `text`; `imageUrls` in body does not change the stored `imageUrls`.
  - Returns `404` when `attachmentId` belongs to a different appointment.
  - Returns `404` when `attachmentId` has `type !== 'note'` (e.g. a recommendation ID).
  - Returns `404` when note was created by a different psychologist.
  - Returns `400 AppointmentNotActive` when `upcoming`.
  - Returns `403` with client role header.

- `DELETE /api/clients/:clientId/appointments/:appointmentId/notes/:attachmentId`:
  - Happy path — deletes note, returns `{ success: true }`.
  - Returns `404` when `attachmentId` belongs to a different appointment.
  - Returns `404` when note was created by a different psychologist.
  - Returns `403` with client role header.

**Frontend** (`AppointmentNotesPanel`)

- Renders "Loading notes..." while fetch is in progress.
- Renders list of notes when fetch succeeds.
- Renders empty state when list is empty.
- Shows error when fetch fails.
- Calls `noteService.create` on form submit, refreshes list.
- Calls `noteService.update` on edit submit, refreshes list.
- Calls `noteService.delete` on confirm-delete, refreshes list.

---

## Out of Scope

- File deletion when a note is deleted — uploaded files persist on disk.
- File serving from CDN/S3 — local disk only for thesis scope.
- Client visibility of notes — always private to the psychologist.
- Impressions (EDG-49) and recommendations (EDG-50) — separate tickets that reuse this ticket's `attachments` table and services.
- Pagination of notes.
