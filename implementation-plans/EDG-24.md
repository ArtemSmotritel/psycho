# Implementation Plan: EDG-24 — Client can review a past appointment

## Issues & Questions

**No issues found.**

The ticket scope is fully defined by the design decisions log. All required backend infrastructure (appointment service functions `findAppointmentByIdForClient`, impression routes at `/api/appointments/:appointmentId/impressions`, recommendation routes at `/api/appointments/:appointmentId/recommendations`, reaction route at `/api/appointments/:appointmentId/recommendations/:id/reaction`, and the `whiteboardSnapshotUrl` column) already exists. The frontend route at `client/appointments/:appointmentId` already exists as `/Users/artem/uni/psycho/frontend/app/routes/client/appointment-detail.tsx` and already handles `past`/`missed` status with impressions and recommendations. The ticket requires completing the whiteboard snapshot display in the past view — this is the only currently missing feature per the `TODO: EDG-47 — whiteboard snapshot` comment in the analogous psychologist view at `/Users/artem/uni/psycho/frontend/app/routes/psychologist/session.tsx` line 77. All backend routes are already implemented. This ticket is purely a frontend gap fill (whiteboard snapshot) plus the corresponding test coverage.

---

## Overview

EDG-24 covers the client's past appointment detail view at `/client/appointments/:appointmentId`. The route already fetches the appointment, loads the client's impressions, loads recommendations with reactions (including done-toggling and comment submission), and shows the psychologist name and time range. The only missing piece per Decision 29 is the whiteboard snapshot display: when `appointment.whiteboardSnapshotUrl` is not null, the past appointment view must render the saved snapshot image. The implementation adds the whiteboard snapshot section to `ClientAppointmentDetail` and adds the corresponding frontend test.

---

## Implementation Steps

### 1. Frontend — Add whiteboard snapshot display to the past appointment view

**File:** `/Users/artem/uni/psycho/frontend/app/routes/client/appointment-detail.tsx`

In the `past`/`missed` render branch (the `if (appointment.status === 'past' || appointment.status === 'missed')` block), add a new section after the appointment header (date, time, psychologist name) and before the `My Impressions` section.

The section should:

- Render a heading `Whiteboard Snapshot` (e.g., `<h3 className="text-lg font-semibold">`).
- When `appointment.whiteboardSnapshotUrl` is not null, render an `<img>` with `src={appointment.whiteboardSnapshotUrl}` and an appropriate `alt` attribute such as `"Whiteboard snapshot"`. Style it to be full-width within a reasonable max-width container, following the visual style used elsewhere in the app (e.g., `className="w-full rounded-md border"`).
- When `whiteboardSnapshotUrl` is null, render a small muted text: `"No whiteboard snapshot available."` following the same pattern used for empty states elsewhere (e.g., `<p className="text-muted-foreground text-sm">`).

The `AppointmentWithPsycho` model already has `whiteboardSnapshotUrl: string | null`, so no model changes are needed.

The section should follow the same placement as the psychologist's past view in `/Users/artem/uni/psycho/frontend/app/routes/psychologist/session.tsx` — after header metadata and before impression/recommendation panels.

---

### 2. Frontend — Tests for the whiteboard snapshot in the past appointment view

**File:** `/Users/artem/uni/psycho/frontend/app/test/client-appointment-detail.test.tsx`

Add new test cases to the existing `describe('ClientAppointmentDetail route', ...)` block. Follow the exact same mock/render pattern already established in that file (mock `useCurrentClientAppointment`, mock `impressionService`, mock `recommendationService.getClientList`).

Add a `pastAppointmentWithSnapshot` fixture extending the existing `pastAppointment` fixture with `whiteboardSnapshotUrl: 'https://example.com/snapshot.png'`. Add a `pastAppointmentNoSnapshot` fixture with `whiteboardSnapshotUrl: null`.

New test cases:

- `renders whiteboard snapshot image when whiteboardSnapshotUrl is present`: set `mockUseCurrentClientAppointment` to return `pastAppointmentWithSnapshot`, call `renderDetail()`, and assert the snapshot `<img>` is in the document (e.g., use `screen.getByRole('img', { name: /whiteboard snapshot/i })`).
- `renders "No whiteboard snapshot available" text when whiteboardSnapshotUrl is null`: set `mockUseCurrentClientAppointment` to return `pastAppointmentNoSnapshot`, assert the fallback text is present.

The existing `pastAppointment` fixture in that file already has `whiteboardSnapshotUrl` missing from the object literal (it does not set it); verify the field defaults correctly or update the fixture to explicitly set `whiteboardSnapshotUrl: null` to avoid the field being `undefined` (TypeScript allows this since `Appointment` defines it as `string | null`, but explicitly setting it is cleaner and consistent).

---

## Files to Create

None.

---

## Files to Modify

| File | Change |
|------|--------|
| `/Users/artem/uni/psycho/frontend/app/routes/client/appointment-detail.tsx` | Add whiteboard snapshot section (image or fallback text) inside the `past`/`missed` render branch |
| `/Users/artem/uni/psycho/frontend/app/test/client-appointment-detail.test.tsx` | Add two new test cases for whiteboard snapshot present and absent, and add `whiteboardSnapshotUrl` fields to existing fixtures for completeness |

---

## Tests

### What to test

**Backend**

No new backend routes are being added. All relevant backend routes for this ticket are already fully tested:
- `GET /api/appointments/:appointmentId` (via `findAppointmentByIdForClient`) — covered in `/Users/artem/uni/psycho/backend/src/features/appointments/routes.test.ts`
- `GET /api/appointments/:appointmentId/impressions` — covered in `/Users/artem/uni/psycho/backend/src/features/attachments/impressions-routes.test.ts`
- `GET /api/appointments/:appointmentId/recommendations` — covered in `/Users/artem/uni/psycho/backend/src/features/attachments/recommendations-routes.test.ts`
- `PATCH /api/appointments/:appointmentId/recommendations/:id/reaction` — covered in `/Users/artem/uni/psycho/backend/src/features/attachments/reactions-routes.test.ts`

No new backend tests are required.

**Frontend**

- `ClientAppointmentDetail route` (in `/Users/artem/uni/psycho/frontend/app/test/client-appointment-detail.test.tsx`):
  - Renders whiteboard snapshot `<img>` when `whiteboardSnapshotUrl` is a non-null string on a past appointment
  - Renders fallback text `"No whiteboard snapshot available."` when `whiteboardSnapshotUrl` is null on a past appointment

---

## Out of Scope

- No backend changes required — all data is already returned by `findAppointmentByIdForClient` via the `whiteboard_snapshot_url` column added in migration `20260313000000_add-whiteboard-snapshot-to-appointments.sql`.
- Impression submission form is already present in the past view — this ticket does not change that behaviour.
- Recommendation reactions (done/comment toggle) are already implemented — this ticket does not change that behaviour.
- The `missed` appointment status is handled identically to `past` in the existing code — no separate treatment needed for `missed`.
- No new API service calls — `appointmentService.getClientAppointmentById` already returns `whiteboardSnapshotUrl`.
- The whiteboard snapshot is static storage URL, not a new file-serving endpoint — it is stored in `appointments.whiteboard_snapshot_url` as a data URL by the psychologist when ending the appointment (EDG-47 scope).
