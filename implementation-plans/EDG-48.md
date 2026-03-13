# Implementation Plan: EDG-48 — Psychologist Notes per Appointment (text, image, audio)

## Issues & Questions

**Questions**

1. **File storage backend**: There is a `fileService` in the frontend (`/Users/artem/uni/psycho/frontend/app/services/file.service.ts`) that calls `POST /api/files/upload`, but no corresponding backend route for file uploads exists in the codebase. EDG-48 requires image and audio attachments. Does a file storage backend (local disk, S3, or similar) need to be wired up as part of this ticket, or should files be stored as base64 blobs in the database for now? This must be resolved before implementation begins — the choice drastically changes the migration and service design.

2. **Note "name" field**: The existing `AttachmentForm` component requires a `name` field. The ticket description does not mention a name/title for notes. Should notes carry a freetext name/title in addition to the body text, or is the body text the only required field?

3. **Editing vs. append-only**: Decision 27 states "no editing after submission" for impressions. The ticket description says notes are "creatable/editable." Confirm: psychologist can edit the text content of a note after creation. Can they also add or remove image/audio files from an existing note in the same edit operation?

4. **Audio storage format**: The `AttachmentForm` records audio as `audio/wav` blobs. Should audio files be stored the same way as image files (uploaded as binary files and stored by URL), or should they be stored differently? (Resolves when file storage question #1 is answered.)

**Logical / business logic issues**

5. **Appointment status constraint**: Decision 5 says notes can be created/edited during **active** or any **past** appointment. The ticket header says "creatable/editable during active or any past appointment (Decision 16)" — Decision 16 is about data preservation after disconnection, not note creation timing. This appears to be a typo in the ticket table. The correct reference is Decision 5. The implementation should enforce the active-or-past constraint.

6. **`/api/files/upload` route does not exist**: If files are required for images and audio, a file upload route must be created. This is not currently in scope for EDG-48 but is a prerequisite. The plan below assumes a pragmatic approach: store file URLs as an array of strings in the notes table (uploaded separately), and a file upload endpoint must exist or be created as part of this ticket. If file upload is out of scope, only the `text` field should be implemented for MVP.

---

## Overview

EDG-48 adds psychologist-private notes to appointments. A note belongs to one appointment, is owned by the psychologist, and is never visible to clients. Notes can be created and edited when the appointment is in **active** or **past** status. Each note has a text body plus optional image URLs and audio URLs. The feature requires: a DB migration for the `appointment_notes` table, backend CRUD routes under `/api/clients/:clientId/appointments/:appointmentId/notes` (psycho-only), a frontend service, TypeScript model, and a UI panel on the past appointment detail view (`frontend/app/routes/psychologist/session.tsx` — currently the "past" branch shows a stub placeholder) and on the live appointment view (`frontend/app/routes/psychologist/live-session.tsx`).

---

## Implementation Steps

### 1. Database Migration

Create a new migration file: `backend/src/migrations/<timestamp>_create-appointment-notes.sql`.

The table:
```sql
CREATE TABLE appointment_notes (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  psycho_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  text           TEXT,
  image_urls     TEXT[] NOT NULL DEFAULT '{}',
  audio_urls     TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON appointment_notes (appointment_id, psycho_id);
```

Add `appointment_notes` to the `ALL_APP_TABLES` array in `backend/src/test-fixtures/db.ts` so tests truncate it properly.

---

### 2. Backend — Models

Create `backend/src/features/notes/models.ts`.

Define:
- `AppointmentNote` interface: `id`, `appointmentId`, `psychoId`, `text: string | null`, `imageUrls: string[]`, `audioUrls: string[]`, `createdAt: string`, `updatedAt: string`.

---

### 3. Backend — Services

Create `backend/src/features/notes/services.ts`.

Functions to implement (all use the `db` import from `config/db`, following the pattern in `backend/src/features/appointments/services.ts`):

- `createNote(params: { appointmentId, psychoId, text, imageUrls, audioUrls }): Promise<AppointmentNote>` — INSERT, RETURNING all fields with camelCase aliases.
- `findNotesByAppointment(appointmentId: string, psychoId: string): Promise<AppointmentNote[]>` — SELECT WHERE appointment_id = $1 AND psycho_id = $2 ORDER BY created_at ASC.
- `findNoteById(noteId: string, psychoId: string): Promise<AppointmentNote | null>` — SELECT WHERE id = $1 AND psycho_id = $2.
- `updateNote(noteId: string, params: { text, imageUrls, audioUrls }): Promise<AppointmentNote>` — UPDATE SET text, image_urls, audio_urls, updated_at = NOW() WHERE id = $1 RETURNING all fields.
- `deleteNote(noteId: string): Promise<void>` — DELETE WHERE id = $1.

---

### 4. Backend — Routes

Create `backend/src/features/notes/routes.ts`.

Route group: `noteRoutes` (a `new Hono()`). All routes use `authorized` + `onlyPsychoRequest` from `../../middlewares/auth`.

The routes are mounted under `/api/clients/:clientId/appointments/:appointmentId/notes`. The `clientId` and `appointmentId` params are available via `c.req.param()`.

For every route, first verify the appointment exists and belongs to the psychologist-client pair using `findAppointmentById` from `../appointments/services`. If not found, return `404`. Then enforce status: notes are only accessible (read/write) when the appointment is `active` or `past`. If the appointment is `upcoming`, return `400` with error `AppointmentNotActive` and message `"Notes are only available during or after an appointment."`.

Routes:

**`GET /`** — List all notes for the appointment.
- Response `200`: `{ notes: AppointmentNote[] }`

**`POST /`** — Create a new note.
- Body: `{ text?: string, imageUrls?: string[], audioUrls?: string[] }`.
- Validation: at least one of `text`, `imageUrls` (non-empty), or `audioUrls` (non-empty) must be provided. If none, return `400` `{ error: 'BadRequest', message: 'A note must have text, at least one image, or at least one audio file.' }`.
- Response `201`: `{ note: AppointmentNote }`.

**`GET /:noteId`** — Get a single note.
- Call `findNoteById(noteId, user.id)`. If null, return `404`.
- Response `200`: `{ note: AppointmentNote }`.

**`PATCH /:noteId`** — Edit a note.
- Call `findNoteById(noteId, user.id)`. If null, return `404`.
- Body: `{ text?: string, imageUrls?: string[], audioUrls?: string[] }` (partial; merge with existing values).
- Re-run the "at least one field" validation against the merged result.
- Response `200`: `{ note: AppointmentNote }`.

**`DELETE /:noteId`** — Delete a note.
- Call `findNoteById(noteId, user.id)`. If null, return `404`.
- Call `deleteNote(noteId)`.
- Response `200`: `{ success: true }`.

---

### 5. Backend — Register Routes

In `backend/src/config/app.ts`, add:

```ts
import { noteRoutes } from '../features/notes/routes'
// ...
app.route('/api/clients/:clientId/appointments/:appointmentId/notes', noteRoutes)
```

This must be added after the existing `appointmentRoutes` mounting line.

---

### 6. Backend — Tests

Create `backend/src/features/notes/routes.test.ts`.

Follow the exact pattern from `backend/src/features/appointments/routes.test.ts`:
- Import `app`, `insertTestUser`, `asUser` from test fixtures.
- Import `linkClientToPsycho` from `../clients/services`.
- Import `createAppointment`, `startAppointment`, `endAppointment` from `../appointments/services`.
- Use `PSYCHO_HEADER = { 'Helpsycho-User-Role': 'psycho' }` and `CLIENT_HEADER = { 'Helpsycho-User-Role': 'client' }` constants.
- Set up a psycho, client, and active/past appointment in each test group.

---

### 7. Frontend — TypeScript Model

Create `frontend/app/models/note.ts`.

Interfaces:
- `AppointmentNote`: `id`, `appointmentId`, `psychoId`, `text: string | null`, `imageUrls: string[]`, `audioUrls: string[]`, `createdAt: string`, `updatedAt: string`.
- `CreateNoteDTO`: `{ text?: string, imageUrls?: string[], audioUrls?: string[] }`.
- `UpdateNoteDTO`: same shape as `CreateNoteDTO` (all optional).

---

### 8. Frontend — Service

Create `frontend/app/services/note.service.ts`.

Follow the pattern in `frontend/app/services/appointment.service.ts`. Base URL segment: `/clients/${clientId}/appointments/${appointmentId}/notes`.

Methods:
- `getList(clientId, appointmentId)` → `GET /`
- `create(clientId, appointmentId, data: CreateNoteDTO)` → `POST /`
- `getById(clientId, appointmentId, noteId)` → `GET /:noteId`
- `update(clientId, appointmentId, noteId, data: UpdateNoteDTO)` → `PATCH /:noteId`
- `delete(clientId, appointmentId, noteId)` → `DELETE /:noteId`

---

### 9. Frontend — Notes Panel Component

Create `frontend/app/components/AppointmentNotesPanel.tsx`.

This is a self-contained panel that:
- Accepts props: `clientId: string`, `appointmentId: string`.
- Fetches notes on mount via `noteService.getList(...)`.
- Displays a list of notes, each showing: text body (if any), image count, audio count, and creation timestamp.
- Has an "Add Note" button that opens a dialog using the existing `AttachmentForm` component (type `'note'`). On submit, calls `noteService.create(...)` and refreshes the list.
- Each note card has an "Edit" action that re-opens the `AttachmentForm` in edit mode (pre-populated) and on submit calls `noteService.update(...)`.
- Each note card has a "Delete" action using the existing `ConfirmAction` component; on confirm calls `noteService.delete(...)`.
- While loading, show a loading state consistent with other routes (e.g. `<p>Loading notes...</p>`).
- If the fetch fails, show an error message.

The `AttachmentForm` component in its current form accepts `name`, `text`, `voiceFiles`, and `imageFiles` as form values. The `AppointmentNotesPanel` must handle the mapping: `voiceFiles` → `audioUrls` (after upload) and `imageFiles` → `imageUrls` (after upload). File upload calls should go through the existing `fileService.upload(file)` pattern from `frontend/app/services/file.service.ts`.

Note: The `name` field in `AttachmentForm` does not map to a field in `AppointmentNote`. If the decision on question #2 is that notes do not have a name, the `AttachmentForm` must either be made to accept an optional `name` prop, or a simpler purpose-built dialog without the name field should be used instead. This decision must be made before implementing this component.

---

### 10. Frontend — Psychologist Past Appointment Detail View

Modify `frontend/app/routes/psychologist/session.tsx`.

Currently the `past` branch returns: `<p>This is a past appointment. Detail view coming in EDG-21.</p>`.

Replace this stub with a proper past appointment detail view that includes:
- Appointment date/time header (already formatted in the `upcoming` branch — reuse that pattern).
- A notes panel: render `<AppointmentNotesPanel clientId={clientId} appointmentId={appointment.id} />`.
- A placeholder section for whiteboard snapshot (EDG-47 will fill this in later — a `{/* TODO: EDG-47 whiteboard snapshot */}` comment is sufficient).
- A placeholder section for client impressions and recommendations (EDG-49/50 will handle these).

The `appointmentId` is available from `useParams()` (already used in the component). The `clientId` is already extracted from `useParams()` in the component.

---

### 11. Frontend — Live Appointment Notes Panel

Modify `frontend/app/routes/psychologist/live-session.tsx`.

Add the `AppointmentNotesPanel` component below the whiteboard section. The panel should be collapsible (using a shadcn/ui `Collapsible` or a simple toggle) so the psychologist can hide it to maximize the whiteboard. Pass `clientId` and `appointmentId` from `useParams()`.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_create-appointment-notes.sql` | Creates the `appointment_notes` table |
| `backend/src/features/notes/models.ts` | `AppointmentNote` TypeScript interface |
| `backend/src/features/notes/services.ts` | Raw SQL CRUD functions for notes |
| `backend/src/features/notes/routes.ts` | Hono route handlers for the notes API |
| `backend/src/features/notes/routes.test.ts` | Backend integration tests for notes API |
| `frontend/app/models/note.ts` | `AppointmentNote` interface + DTOs |
| `frontend/app/services/note.service.ts` | Axios wrapper for the notes API |
| `frontend/app/components/AppointmentNotesPanel.tsx` | Notes CRUD panel component |

---

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Register `noteRoutes` under `/api/clients/:clientId/appointments/:appointmentId/notes` |
| `backend/src/test-fixtures/db.ts` | Add `'appointment_notes'` to `ALL_APP_TABLES` |
| `frontend/app/routes/psychologist/session.tsx` | Replace the `past` appointment stub with a real detail view that renders `AppointmentNotesPanel` |
| `frontend/app/routes/psychologist/live-session.tsx` | Add `AppointmentNotesPanel` below the whiteboard |

---

## Tests

### What to test

**Backend**

- `GET /api/clients/:clientId/appointments/:appointmentId/notes`:
  - Happy path (past appointment, returns list of notes belonging to the psycho).
  - Returns `[]` when no notes exist.
  - Returns `403` when called with client role header.
  - Returns `401` when unauthenticated.
  - Returns `404` when appointment does not belong to the psycho-client pair.
  - Returns `400 AppointmentNotActive` when appointment is in `upcoming` status.

- `POST /api/clients/:clientId/appointments/:appointmentId/notes`:
  - Happy path (active appointment, creates note with text only).
  - Happy path (past appointment, creates note with text + imageUrls).
  - Returns `400 BadRequest` when body has no text, no imageUrls, and no audioUrls.
  - Returns `400 AppointmentNotActive` when appointment is `upcoming`.
  - Returns `403` when called with client role header.
  - Returns `401` when unauthenticated.

- `PATCH /api/clients/:clientId/appointments/:appointmentId/notes/:noteId`:
  - Happy path (updates text of an existing note).
  - Returns `404` when noteId does not belong to the psychologist.
  - Returns `404` when appointment is not found.
  - Returns `400 AppointmentNotActive` when appointment is `upcoming`.
  - Returns `403` with client role.

- `DELETE /api/clients/:clientId/appointments/:appointmentId/notes/:noteId`:
  - Happy path (deletes a note, returns `{ success: true }`).
  - Returns `404` when note does not belong to the psychologist.
  - Returns `403` with client role.

**Frontend**

- `AppointmentNotesPanel`:
  - Renders "Loading notes..." while fetch is in progress.
  - Renders a list of notes when fetch succeeds.
  - Renders an empty state when the list is empty.
  - Shows an error message when the fetch fails.
  - Calls `noteService.create` when the "Add Note" form is submitted and refreshes the list.
  - Calls `noteService.update` when the edit form is submitted and refreshes the list.
  - Calls `noteService.delete` when the confirm-delete action is confirmed and refreshes the list.

---

## Out of Scope

- File upload backend endpoint (prerequisite that must be resolved per question #1 — if it does not exist, image and audio fields are accepted as URL strings from an external upload mechanism and are not uploaded within this ticket).
- Client visibility of notes — notes are always private to the psychologist (Decision 16).
- Client impressions (EDG-49) and psychologist recommendations (EDG-50) — these are separate tickets.
- Whiteboard snapshot display in the past appointment view (EDG-47).
- Email notifications triggered by note creation.
- Pagination of notes (the list is expected to be small per appointment).
