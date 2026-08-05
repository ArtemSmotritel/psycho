# Implementation Plan: EDG-47 — Whiteboard saved as snapshot on appointment end

## Issues & Questions

1. **Snapshot storage mechanism is unspecified.** The ticket says "static image saved." There is no file storage infrastructure in the codebase (no S3, no local file-serving route, no upload service). Two options exist: (a) store the snapshot as a base64 data URL directly in the `appointments` table column (simple, no storage service, but large rows for complex boards), or (b) store it as a file on disk served by a static route. Given the thesis scope and absence of any external storage, option (a) — storing as a base64 data URL in the DB column — is the pragmatic choice and avoids introducing a new external dependency. This is a decision the developer must confirm. This plan assumes option (a).
  2. Answer: YES, option a

2. **Who initiates the snapshot export.** The snapshot is generated client-side (in the browser) using the Excalidraw imperative API (`exportToBlob`). The psychologist's browser has the live canvas. When `handleEndAppointment` is called in `live-session.tsx`, the frontend must export the whiteboard to a blob, convert it to a base64 data URL, and send it in the body of the `PATCH .../end` request before the server transitions the appointment to `past`. This is the only viable approach since the backend has no access to the Excalidraw canvas.
  3. Answer: YES

3. **Snapshot is optional or required?** What if the psychologist has an empty whiteboard or closes the tab before ending? The `end` endpoint currently requires no body. After this ticket, the body will optionally accept `{ snapshotDataUrl: string | null }`. If the field is absent or null, `whiteboard_snapshot_url` should be saved as `null`. This is a safe graceful default.
  4. Answer: YES, optional

4. **`exportToBlob` API availability for `@excalidraw/excalidraw@^0.18.0`.** The `@excalidraw/excalidraw` package exports `exportToBlob` from the package root. The existing `live-session.tsx` imports Excalidraw lazily via a dynamic import. `exportToBlob` must be imported directly (non-lazy) in the `handleEndAppointment` function since it is a standalone utility function, not a component.
  5. Answer: import statically now. Leave a todo comment to improve it later

5. **Past appointment detail views (EDG-21 for psychologist, EDG-24 for client) are not yet implemented** — their routes currently show only placeholder text. The snapshot display described in Decision 29 is part of those tickets' scope. This ticket's frontend scope is therefore limited to: (a) capturing and sending the snapshot on appointment end in `live-session.tsx`, and (b) adding `whiteboardSnapshotUrl` to the `Appointment` frontend model and to the `getById`/`getClientAppointmentById` API response shapes, so the past appointment detail views can use them when implemented. Displaying the snapshot image is **not** part of this ticket.
  6. Answer: YES

No other issues found.

## Overview

EDG-47 adds whiteboard snapshot persistence. When the psychologist ends an appointment, `live-session.tsx` calls Excalidraw's `exportToBlob` API to export the current canvas as a PNG, converts it to a base64 data URL, and includes it in the existing `PATCH /api/clients/:clientId/appointments/:appointmentId/end` request body. The backend stores the snapshot in a new `whiteboard_snapshot_url` column on the `appointments` table (nullable TEXT). All queries that return appointment rows are updated to include `whiteboardSnapshotUrl` in their `RETURNING` / `SELECT` projections. The `Appointment` model and service call types on both backend and frontend are updated accordingly. The snapshot is not yet displayed — that belongs to EDG-21 and EDG-24 — but the data is available in all appointment-fetching responses for those tickets to consume.

## Implementation Steps

### 1. Database — migration

Create a new migration file: `backend/src/migrations/20260313000000_add-whiteboard-snapshot-to-appointments.sql`

```sql
ALTER TABLE appointments
    ADD COLUMN whiteboard_snapshot_url TEXT DEFAULT NULL;
```

No index is needed. This is a simple nullable column addition.

### 2. Tests — backend

Add to `backend/src/features/appointments/routes.test.ts` in a new `describe` block for `PATCH /api/clients/:clientId/appointments/:appointmentId/end`. Follow the exact patterns already in this file (use `insertTestUser`, `asUser`, `linkClientToPsycho`, `createAppointment`, `startAppointment` from the existing fixtures and services). Write the following cases:

- Happy path with snapshot: `snapshotDataUrl` present in the body — response `200`, `appointment.status === 'past'`, `appointment.whiteboardSnapshotUrl` equals the sent value.
- Happy path without snapshot: body is `{}` or `{ snapshotDataUrl: null }` — response `200`, `appointment.whiteboardSnapshotUrl` is `null`.
- Already-past appointment: `400 AppointmentNotEndable` (pre-existing behavior, do not change).
- Not found: `404` (pre-existing behavior, do not change).

Also update `backend/src/test-fixtures/db.ts` — add `'appointments'` column check is not needed since it's already there, but ensure the `ALL_APP_TABLES` truncation will clean the new column automatically (it will, since it truncates the whole table).

### 3. Tests — frontend

Add a new test in `frontend/app/test/live-session.test.tsx` for the snapshot capture and send behavior. Follow the exact mock patterns already in this file (mocking `~/services/appointment.service`, `~/hooks/useCurrentAppointment`, `~/hooks/useWhiteboardSync`, `@excalidraw/excalidraw`).

Add a mock for `@excalidraw/excalidraw`'s `exportToBlob` function that returns a fake `Blob`. The test should verify:

- When the psychologist confirms end, `exportToBlob` is called with the API instance's scene elements and files.
- `appointmentService.end` is called with the correct `clientId`, `appointmentId`, **and** the base64 data URL in the third argument.
- On success, navigates to the past appointment detail route.
- If `exportToBlob` throws, `appointmentService.end` is still called with `snapshotDataUrl: null` (graceful fallback) — snapshot failure must not block appointment end.

Do not modify any previously-passing test cases.

### 4. Backend — update `Appointment` model

File: `backend/src/features/appointments/models.ts`

Add `whiteboardSnapshotUrl: string | null` to the `Appointment` interface.

### 5. Backend — update all SQL queries in `services.ts`

File: `backend/src/features/appointments/services.ts`

Every `SELECT` and `RETURNING` clause that currently projects appointment columns must add:

```
whiteboard_snapshot_url AS "whiteboardSnapshotUrl"
```

This affects: `createAppointment`, `findAppointmentById`, `updateAppointment`, `startAppointment`, `endAppointment`, `findActiveAppointmentByPsycho`, `findAppointmentByIdForClient`, `findAppointmentByIdForParticipant`, `listAppointmentsForClient`, `listAllAppointmentsForPsycho`, `listAppointments`.

Add a new service function `endAppointmentWithSnapshot(appointmentId: string, snapshotDataUrl: string | null): Promise<Appointment>` that does:

```sql
UPDATE appointments
SET status = 'past',
    whiteboard_snapshot_url = ${snapshotDataUrl}
WHERE id = ${appointmentId}
RETURNING id, psycho_id AS "psychoId", client_id AS "clientId",
          start_time AS "startTime", end_time AS "endTime",
          status, google_meet_link AS "googleMeetLink",
          whiteboard_snapshot_url AS "whiteboardSnapshotUrl",
          created_at AS "createdAt"
```

The old `endAppointment` service function can be left in place or updated to call `endAppointmentWithSnapshot(appointmentId, null)` — keep it to avoid breaking any direct service callers, but the route will now call `endAppointmentWithSnapshot`.

### 6. Backend — update `PATCH /:appointmentId/end` route

File: `backend/src/features/appointments/routes.ts`

Remove the `// TODO: EDG-47` comment.

Update the end route handler to:

1. Parse the request body with `c.req.json()`.
2. Extract `snapshotDataUrl: string | null` from the body (default to `null` if missing or not a string).
3. Call `endAppointmentWithSnapshot(appointmentId, snapshotDataUrl ?? null)` instead of `endAppointment(appointmentId)`.
4. Return `c.json({ appointment }, 200)` as before.

The validation should accept: `snapshotDataUrl` as a string (data URL) or `null` or absent. Do not reject the request if the field is missing.

Import `endAppointmentWithSnapshot` from `./services`.

### 7. Frontend — update `Appointment` model

File: `frontend/app/models/appointment.ts`

Add `whiteboardSnapshotUrl: string | null` to the `Appointment` interface.

### 8. Frontend — update `appointmentService.end`

File: `frontend/app/services/appointment.service.ts`

Change the `end` method signature to accept an optional third argument:

```ts
end: (clientId: string, appointmentId: string, snapshotDataUrl?: string | null) =>
    api.patch<{ appointment: Appointment }>(
        `/clients/${clientId}/appointments/${appointmentId}/end`,
        { snapshotDataUrl: snapshotDataUrl ?? null },
    ),
```

### 9. Frontend — update `handleEndAppointment` in `live-session.tsx`

File: `frontend/app/routes/psychologist/live-session.tsx`

Import `exportToBlob` from `@excalidraw/excalidraw` at the top of the file (non-lazy, named import).

Update `handleEndAppointment` to:

1. Attempt snapshot export before calling the API:
   - If `excalidrawAPIInstance` is not null, call `exportToBlob({ elements: excalidrawAPIInstance.getSceneElements(), files: excalidrawAPIInstance.getFiles(), mimeType: 'image/png' })`.
   - Convert the resulting `Blob` to a base64 data URL using a `FileReader` or `URL.createObjectURL` + canvas — use the `FileReader` approach since `data:` URLs are needed for DB storage.
   - Wrap in a try/catch; on failure, set `snapshotDataUrl` to `null`.
2. Call `appointmentService.end(clientId!, appointmentId!, snapshotDataUrl)`.
3. The rest of the handler (success toast, navigation) remains unchanged.

The `excalidrawAPIInstance` state is already present in `live-session.tsx` and is set via the `excalidrawAPI` callback prop on the `Excalidraw` component.

### 10. Update `backend/src/test-fixtures/db.ts`

No change is required. The `appointments` table is already in `ALL_APP_TABLES` and truncation removes all columns.

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/20260313000000_add-whiteboard-snapshot-to-appointments.sql` | ALTER TABLE to add `whiteboard_snapshot_url TEXT DEFAULT NULL` to `appointments` |

## Files to Modify

| Path | Changes |
|------|---------|
| `backend/src/features/appointments/models.ts` | Add `whiteboardSnapshotUrl: string \| null` to `Appointment` interface |
| `backend/src/features/appointments/services.ts` | Add `whiteboardSnapshotUrl` to all SELECT/RETURNING projections; add `endAppointmentWithSnapshot` function |
| `backend/src/features/appointments/routes.ts` | Update end route to parse body, extract `snapshotDataUrl`, call `endAppointmentWithSnapshot`; remove TODO comment |
| `backend/src/features/appointments/routes.test.ts` | Add new tests for end-with-snapshot and end-without-snapshot cases |
| `frontend/app/models/appointment.ts` | Add `whiteboardSnapshotUrl: string \| null` to `Appointment` interface |
| `frontend/app/services/appointment.service.ts` | Update `end` to accept and forward `snapshotDataUrl` |
| `frontend/app/routes/psychologist/live-session.tsx` | Import `exportToBlob`; update `handleEndAppointment` to capture and send snapshot |
| `frontend/app/test/live-session.test.tsx` | Add tests for snapshot capture, send, and fallback behavior |

## Tests

### What to test

**Backend**

- `PATCH /api/clients/:clientId/appointments/:appointmentId/end` with snapshot: happy path — `snapshotDataUrl` string in body, response is `200`, `appointment.status === 'past'`, `appointment.whiteboardSnapshotUrl` equals sent value.
- `PATCH .../end` without snapshot: body is `{}` — response `200`, `appointment.whiteboardSnapshotUrl` is `null`.
- `PATCH .../end` on already-past appointment: response `400 AppointmentNotEndable` (existing behavior, do not change or remove this test).
- `PATCH .../end` on non-existent appointment: response `404` (existing behavior).

**Frontend**

- `LiveSession` — `handleEndAppointment` with valid Excalidraw API instance: verifies `exportToBlob` is called and its result is passed as third arg to `appointmentService.end`.
- `LiveSession` — `handleEndAppointment` when `exportToBlob` throws: verifies `appointmentService.end` is still called with `snapshotDataUrl: null` (graceful fallback, appointment end is not blocked).
- `LiveSession` — `handleEndAppointment` when `excalidrawAPIInstance` is null: verifies `appointmentService.end` is called with `snapshotDataUrl: null`.

## Out of Scope

- Displaying the whiteboard snapshot in the past appointment detail views (EDG-21 for psychologist, EDG-24 for client) — that is part of those tickets.
- Any external file/object storage (S3, R2, local disk serving) — snapshot stored as a base64 data URL directly in the `appointments` table column.
- Snapshot for the client-side view — the client does not have an "End Appointment" button; only the psychologist captures and sends the snapshot.
- `live-appointment.tsx` changes (client view) — no snapshot logic needed there; the client simply reads `whiteboardSnapshotUrl` from the appointment record, which becomes available automatically via the updated model.
- Snapshot compression or resizing — stored as-is from `exportToBlob`.
