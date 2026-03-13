# Implementation Plan: EDG-49 — Client impressions per appointment (text, image, audio)

## Issues & Questions

1. **Audio/image storage is not yet implemented in the codebase.** EDG-49 says impressions support text, image, and audio. There is no file upload/storage infrastructure in the backend — no S3 bucket, no disk-based upload route, no working attachment endpoints beyond a stub. The existing `session.service.ts` and `attachment.service.ts` on the frontend use fake test data and unimplemented TODOs. Implementing full audio and image support requires file storage that does not yet exist. **Decision needed: should this ticket implement text-only impressions for now and defer media (image, audio) to a follow-up ticket?** The plan below implements text-only impressions per the principle of building on real infrastructure, with image/audio left as a clearly marked out-of-scope stub column in the DB migration for forward compatibility.

2. **Which route owns impressions — the client-scoped route (`/api/appointments/:appointmentId/...`) or a new psychologist-facing route (`/api/clients/:clientId/appointments/:appointmentId/impressions`)?** The ticket says impressions are visible to both parties. The client submits them; the psychologist reads them on the past appointment detail view (EDG-21). The simplest design is: the client creates impressions through `/api/appointments/:appointmentId/impressions` (client-auth route), and both the client and the psychologist can read them through their respective appointment detail routes. There is no ambiguity here but the plan documents the split explicitly.

3. **Impression creation is allowed during `active` or `past` state (Decision 27).** This conflicts with a naive "appointment must be active" guard. The route must explicitly allow both `active` and `past` — `upcoming` state is not allowed.

4. **The client past appointment detail view (`/client/appointments/:appointmentId`) currently shows a placeholder message** ("Detail view coming in EDG-24"). EDG-49 requires a place for the client to submit impressions. The plan integrates impression submission into the live appointment page (`live-appointment.tsx`) for the `active` case and extends the client appointment detail page for the `past` case. The full past detail view (EDG-24) and psychologist past detail view (EDG-21) are not fully implemented yet — EDG-49 should add impression display and submission there, but the plan notes where those stubs are and what needs replacing.

No other issues found.

---

## Overview

EDG-49 adds client impressions to appointments. An impression is a timestamped, immutable text entry (with stubbed image/audio columns) that the client can submit during an `active` or `past` appointment. Multiple submissions are allowed; no editing after submission. Both parties (client and psychologist) can read impressions. The implementation adds one new DB table, a backend feature module (`impressions/`) with services and two route files (client-write, shared-read), registers the routes in `app.ts`, adds a frontend model, a service file, and updates two frontend pages: `live-appointment.tsx` (add inline impression form) and `appointment-detail.tsx` (replace past-appointment placeholder with impressions list + submission form).

---

## Implementation Steps

### 1. Database migration

Create file: `backend/src/migrations/<timestamp>_create-appointment-impressions.sql`

Generate the timestamp with `bun run migration:create -- --name create-appointment-impressions`.

Table definition:

```sql
CREATE TABLE appointment_impressions (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    client_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    text           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON appointment_impressions (appointment_id);
CREATE INDEX ON appointment_impressions (client_id);
```

Notes:
- `text` is nullable to leave room for future image/audio-only submissions.
- No image or audio columns yet — those require file storage infrastructure outside this ticket's scope.
- `client_id` is stored on each row (denormalized from the appointment) for fast per-client queries and to enforce that a client can only read their own impressions via client-scoped queries.
- No `psycho_id` column because the appointment already joins to it; queries that need psycho scoping join through `appointments`.

### 2. Update `backend/src/test-fixtures/db.ts`

Add `'appointment_impressions'` to the `ALL_APP_TABLES` array. This ensures the test DB truncation cleans the new table between tests.

### 3. Backend — models

Create file: `backend/src/features/impressions/models.ts`

Define the `Impression` TypeScript interface matching the DB schema:

```ts
export interface Impression {
    id: string
    appointmentId: string
    clientId: string
    text: string | null
    createdAt: string // ISO 8601
}
```

### 4. Backend — services

Create file: `backend/src/features/impressions/services.ts`

Follow the raw SQL pattern used in `backend/src/features/appointments/services.ts`. Import `db` from `config/db`.

Functions to implement:

**`createImpression(params: { appointmentId: string; clientId: string; text: string | null }): Promise<Impression>`**
- `INSERT INTO appointment_impressions (appointment_id, client_id, text) VALUES (...) RETURNING id, appointment_id AS "appointmentId", client_id AS "clientId", text, created_at AS "createdAt"`

**`listImpressionsForAppointment(appointmentId: string): Promise<Impression[]>`**
- `SELECT ... FROM appointment_impressions WHERE appointment_id = $appointmentId ORDER BY created_at ASC`
- Used by both client and psychologist to read all impressions for an appointment.

**`listImpressionsForClientAppointment(appointmentId: string, clientId: string): Promise<Impression[]>`**
- Same as above but adds `AND client_id = $clientId`.
- Used by the client-only read route (cannot read another client's impressions).

### 5. Backend — client impression routes (write + client-read)

Create file: `backend/src/features/impressions/client-routes.ts`

This file contains routes accessible by the client role only. Mount point in `app.ts` will be `/api/appointments/:appointmentId/impressions`.

**`POST /` — submit a new impression**

- Guard: `authorized`, `onlyClientRequest`
- Read `appointmentId` from route params, `user.id` as `clientId`.
- Read `text` from request body. At minimum, `text` must be a non-empty string (since image/audio not yet supported). Return `400` with `{ error: 'BadRequest', message: 'text is required' }` if missing or empty.
- Fetch the appointment using `findAppointmentByIdForClient(appointmentId, clientId)` (imported from `features/appointments/services.ts`). Return `404` with `{ error: 'NotFound' }` if not found.
- Check `appointment.status`. If `upcoming`, return `400` with `{ error: 'AppointmentNotStarted', message: 'Impressions can only be submitted during an active or past appointment.' }`.
- Call `createImpression({ appointmentId, clientId: user.id, text })`.
- Return `201` with `{ impression }`.

**`GET /` — list impressions for an appointment (client's own)**

- Guard: `authorized`, `onlyClientRequest`
- Fetch the appointment using `findAppointmentByIdForClient(appointmentId, clientId)`. Return `404` if not found.
- Call `listImpressionsForClientAppointment(appointmentId, clientId)`.
- Return `200` with `{ impressions }`.

### 6. Backend — psychologist impression read route

Create file: `backend/src/features/impressions/psycho-routes.ts`

This file contains the psychologist-only read route for impressions. Mount point in `app.ts` will be `/api/clients/:clientId/appointments/:appointmentId/impressions`.

**`GET /` — list all impressions for an appointment**

- Guard: `authorized`, `onlyPsychoRequest`
- Read `clientId` and `appointmentId` from route params.
- Fetch the appointment using `findAppointmentById(appointmentId)` from `features/appointments/services.ts`. Verify `appointment.clientId === clientId && appointment.psychoId === user.id`. If not found or mismatch, return `404`.
- Call `listImpressionsForAppointment(appointmentId)`.
- Return `200` with `{ impressions }`.

### 7. Backend — register routes in `app.ts`

File: `backend/src/config/app.ts`

Add two new route registrations after the existing appointment routes:

```ts
import { clientImpressionRoutes } from '../features/impressions/client-routes'
import { psychoImpressionRoutes } from '../features/impressions/psycho-routes'

// after existing app.route calls:
app.route('/api/appointments/:appointmentId/impressions', clientImpressionRoutes)
app.route('/api/clients/:clientId/appointments/:appointmentId/impressions', psychoImpressionRoutes)
```

Note: Hono does not automatically propagate parent route params (`:appointmentId`, `:clientId`) into child routers mounted with `app.route`. Use `c.req.param('appointmentId')` in the route handlers — Hono's param extraction with `app.route` path prefix does work correctly for these named params when the full path is specified in the mount.

### 8. Backend — tests

Create file: `backend/src/features/impressions/routes.test.ts`

Follow the exact pattern from `backend/src/features/appointments/routes.test.ts`:

- Use `insertTestUser`, `asUser` from `../../test-fixtures/users`.
- Use `linkClientToPsycho` from `../clients/services`.
- Use `createAppointment`, `startAppointment`, `endAppointment` from `../appointments/services`.
- Use `PSYCHO_HEADER` and `CLIENT_HEADER` constants.

Test groups:

**`POST /api/appointments/:appointmentId/impressions`**
- Returns 201 with impression when appointment is `active`
- Returns 201 with impression when appointment is `past`
- Returns 400 `AppointmentNotStarted` when appointment is `upcoming`
- Returns 400 `BadRequest` when `text` is missing
- Returns 404 when appointment does not exist for this client
- Returns 401 for unauthenticated request
- Returns 403 for psychologist-role request

**`GET /api/appointments/:appointmentId/impressions`**
- Returns 200 with empty array when no impressions exist
- Returns 200 with impressions in ascending chronological order
- Returns 404 when appointment does not belong to the requesting client
- Returns 401 for unauthenticated request
- Returns 403 for psychologist-role request

**`GET /api/clients/:clientId/appointments/:appointmentId/impressions`**
- Returns 200 with all impressions
- Returns 404 when appointment does not belong to this psychologist-client pair
- Returns 401 for unauthenticated request
- Returns 403 for client-role request

### 9. Frontend — model

Create file: `frontend/app/models/impression.ts`

```ts
export interface Impression {
    id: string
    appointmentId: string
    clientId: string
    text: string | null
    createdAt: string // ISO 8601
}

export interface CreateImpressionDTO {
    text: string
}
```

### 10. Frontend — service

Create file: `frontend/app/services/impression.service.ts`

Follow the pattern from `frontend/app/services/appointment.service.ts`. Use `api` from `./api`.

Methods:

- `submitImpression(appointmentId: string, data: CreateImpressionDTO): Promise<...>` — `POST /appointments/:appointmentId/impressions`
- `getClientImpressions(appointmentId: string): Promise<...>` — `GET /appointments/:appointmentId/impressions`
- `getPsychoImpressions(clientId: string, appointmentId: string): Promise<...>` — `GET /clients/:clientId/appointments/:appointmentId/impressions`

Return types: `api.post<{ impression: Impression }>`, `api.get<{ impressions: Impression[] }>`.

### 11. Frontend — `ImpressionForm` component

Create file: `frontend/app/components/ImpressionForm.tsx`

A compact form that renders a `Textarea` (shadcn/ui) and a "Submit" `Button`. Props:

- `onSubmit: (text: string) => Promise<void>` — called when the form is submitted; parent handles the API call and error state.
- `isSubmitting: boolean` — disables the button and textarea while the request is in flight.

Behavior: clears the textarea after a successful submit (parent signals success by not throwing). Shows a loading state on the button. No editing after submission — the form is stateless and resets after each submit. Matches the 4-space indent, semicolons, trailing commas Prettier config.

### 12. Frontend — `ImpressionList` component

Create file: `frontend/app/components/ImpressionList.tsx`

Props:

- `impressions: Impression[]`
- `isLoading: boolean`

Renders impressions in ascending order (as returned by the API). Each entry shows:
- The `text` field content.
- The `createdAt` timestamp formatted with `date-fns` `format(new Date(impression.createdAt), 'PPP HH:mm')`.

Shows a "No impressions yet." message when `impressions` is empty and not loading. Shows a loading skeleton or spinner while `isLoading` is true. Import `Impression` from `~/models/impression`.

### 13. Frontend — update `live-appointment.tsx`

File: `frontend/app/routes/client/live-appointment.tsx`

During an `active` appointment, the client should be able to submit impressions. Add the following below the whiteboard section (after the `WhiteboardCursorOverlay` div):

- A section heading "My Impressions".
- `ImpressionList` component fed from local state (`impressions: Impression[]`, fetched on mount via `impressionService.getClientImpressions(appointmentId)` and refreshed after each successful submission).
- `ImpressionForm` component. On submit: call `impressionService.submitImpression(appointmentId, { text })`. On success: re-fetch or append new impression to local state. On error: display a toast error ("Failed to submit impression. Please try again.").
- Import `impressionService` from `~/services/impression.service`, `Impression` from `~/models/impression`, `ImpressionForm` from `~/components/ImpressionForm`, `ImpressionList` from `~/components/ImpressionList`.

### 14. Frontend — update `appointment-detail.tsx`

File: `frontend/app/routes/client/appointment-detail.tsx`

The `past` appointment branch currently shows: `<p>This is a past appointment. Detail view coming in EDG-24.</p>`. Replace this with a real past appointment detail view that includes:

- Date and time header (same format as the upcoming branch).
- Google Meet alert block (same as existing upcoming branch).
- "My Impressions" section showing `ImpressionList` (fetched via `impressionService.getClientImpressions(appointmentId)`).
- `ImpressionForm` for submitting new impressions (Decision 27: impressions allowed at any point after the appointment ends).
- `isLoading` and error states following the same pattern as other routes in the codebase.

Import `impressionService`, `ImpressionForm`, `ImpressionList`, `Impression` as in step 13. The `useCurrentClientAppointment` hook already fetches the appointment — no change needed there.

### 15. Frontend — expose impressions on the psychologist's past appointment view

File: `frontend/app/routes/psychologist/session.tsx`

The psychologist past appointment branch currently shows: `<p>This is a past appointment. Detail view coming in EDG-21.</p>`. Add a basic client impressions display for the `past` case:

- Fetch impressions on mount via `impressionService.getPsychoImpressions(clientId, appointmentId)`.
- Render `ImpressionList` (read-only — no form since the psychologist cannot submit client impressions).
- Keep the existing placeholder text for the full EDG-21 detail view features (notes, recommendations, whiteboard snapshot) that are not in scope for EDG-49.

This makes the psychologist view of impressions functional without waiting for EDG-21 to be fully implemented.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_create-appointment-impressions.sql` | SQL migration creating the `appointment_impressions` table |
| `backend/src/features/impressions/models.ts` | `Impression` TypeScript interface for the backend |
| `backend/src/features/impressions/services.ts` | Raw SQL service functions |
| `backend/src/features/impressions/client-routes.ts` | Hono router: `POST /` and `GET /` for client role |
| `backend/src/features/impressions/psycho-routes.ts` | Hono router: `GET /` for psychologist role |
| `backend/src/features/impressions/routes.test.ts` | Integration tests for all three routes |
| `frontend/app/models/impression.ts` | `Impression` interface and `CreateImpressionDTO` |
| `frontend/app/services/impression.service.ts` | Axios-wrapped API calls for impressions |
| `frontend/app/components/ImpressionForm.tsx` | Controlled textarea + submit button component |
| `frontend/app/components/ImpressionList.tsx` | Renders a list of impressions in chronological order |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/test-fixtures/db.ts` | Add `'appointment_impressions'` to `ALL_APP_TABLES` |
| `backend/src/config/app.ts` | Register `clientImpressionRoutes` and `psychoImpressionRoutes` |
| `frontend/app/routes/client/live-appointment.tsx` | Add impression submission form and list below the whiteboard |
| `frontend/app/routes/client/appointment-detail.tsx` | Replace past-appointment placeholder with real past detail view including impressions |
| `frontend/app/routes/psychologist/session.tsx` | Replace past-appointment placeholder with psychologist impressions read view |

---

## Tests

### What to test

**Backend**

- `POST /api/appointments/:appointmentId/impressions`: happy path with `active` appointment, happy path with `past` appointment, `upcoming` appointment returns 400 `AppointmentNotStarted`, missing `text` returns 400, appointment not found (wrong client) returns 404, unauthenticated returns 401, psychologist role returns 403.
- `GET /api/appointments/:appointmentId/impressions` (client): happy path returns impressions in ascending order, empty list returns empty array, appointment not belonging to client returns 404, unauthenticated returns 401, psychologist role returns 403.
- `GET /api/clients/:clientId/appointments/:appointmentId/impressions` (psycho): happy path returns all impressions, appointment not belonging to psychologist-client pair returns 404, unauthenticated returns 401, client role returns 403.

**Frontend**

- `ImpressionForm`: renders textarea and submit button, disables both while `isSubmitting` is true, calls `onSubmit` with trimmed text on submit, clears textarea after successful submit.
- `ImpressionList`: renders "No impressions yet." when given empty array, renders each impression's text and formatted timestamp, shows loading state when `isLoading` is true.
- `live-appointment.tsx` (integration behavior): after successful impression submit the new impression appears in the list, submit error shows a toast.
- `appointment-detail.tsx` (past branch): renders impressions list fetched from API, renders impression form, form submission calls `impressionService.submitImpression`.

---

## Out of Scope

- Image attachments on impressions — no file storage infrastructure exists.
- Audio attachments on impressions — same reason.
- Editing or deleting impressions — Decision 27 explicitly forbids editing after submission; deletion is not mentioned in the ticket or design decisions.
- Psychologist submitting impressions — impressions are client-only.
- Impression display on the full psychologist past appointment detail view (EDG-21) — EDG-49 adds a minimal read in `session.tsx` but the full EDG-21 detail view with notes, recommendations, and whiteboard snapshot is a separate ticket.
- Impression display on the client progress timeline (EDG-52) — separate ticket.
