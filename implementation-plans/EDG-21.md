# Implementation Plan: EDG-21 — Psycho can review a past appointment

## Issues & Questions

> **No blocking issues found.**
>
> One clarification for the record: the whiteboard snapshot is out of scope for EDG-21 because it depends on EDG-47 (snapshot saved when psychologist ends appointment). The existing `{/* TODO: EDG-47 — whiteboard snapshot */}` comment in `session.tsx` is the correct placeholder. EDG-21 should render the snapshot only when `whiteboardSnapshotUrl` is non-null (it may be null for all appointments until EDG-47 ships). This is safe — the data model and DB column already exist; only the display is missing from this route.
>
> One naming note: the backend `Appointment` model carries the statuses `'warning'` and `'missed'` in addition to the three canonical states. Per Decision 5, only `upcoming`, `active`, and `past` are official. `warning` and `missed` are computed intermediate/display states the backend derives but they are not stored. The past-appointment branch in `session.tsx` already handles both `past` and `missed` together, which is correct.

## Overview

EDG-21 delivers the psychologist's past-appointment detail view. The core data surface (notes, client impressions, recommendations, whiteboard snapshot) is already partially assembled in `frontend/app/routes/psychologist/session.tsx`. The work is:

1. Add the whiteboard snapshot display to the past-appointment branch in `session.tsx` (renders when `whiteboardSnapshotUrl` is non-null, skipped when null).
2. Add backend tests for `GET /api/clients/:clientId/appointments/:appointmentId/impressions` (the psychologist-side route in `impressionPsychoRoutes`) — currently untested.
3. Add frontend tests for the past-appointment branch of `session.tsx` — currently covered only by a single trivial case in `upcoming-appointment.test.tsx`.

No new migrations, routes, services, or frontend models are needed.

---

## Implementation Steps

### 1. Tests — Backend: psychologist impression list route

Create `/Users/artem/uni/psycho/backend/src/features/attachments/impressions-psycho-routes.test.ts`.

Follow the exact fixture and assertion patterns from `/Users/artem/uni/psycho/backend/src/features/attachments/notes-routes.test.ts`. Use `insertTestUser`, `linkClientToPsycho`, `createAppointment`, `startAppointment`, `endAppointment`, and `createAttachment` from the existing test fixtures.

The route under test is `GET /api/clients/:clientId/appointments/:appointmentId/impressions` (handled by `impressionPsychoRoutes`).

Cases to cover (see Tests section for full list).

### 2. Tests — Frontend: past appointment branch of `session.tsx`

Create `/Users/artem/uni/psycho/frontend/app/test/past-appointment.test.tsx`.

Follow the structure of `/Users/artem/uni/psycho/frontend/app/test/upcoming-appointment.test.tsx`. Mock:
- `~/hooks/useCurrentAppointment` with a controlled getter pattern
- `~/services/impression.service` (mock `getPsychoList`)
- `~/hooks/useRoleGuard` returning `{ userRole: 'psychologist' }`
- `~/components/AppointmentNotesPanel` with a simple stub (renders a `data-testid="notes-panel"` div)
- `~/components/AppointmentRecommendationsPanel` with a simple stub (renders a `data-testid="recommendations-panel"` div)
- `~/components/ImpressionList` — use the real component (it has no service calls itself) so impression data can be asserted directly

Render the `Session` component from `~/routes/psychologist/session` inside a `MemoryRouter` with path pattern `/:role/clients/:clientId/appointments/:appointmentId`.

Cases to cover (see Tests section).

### 3. Frontend: Whiteboard snapshot display in `session.tsx`

Modify `/Users/artem/uni/psycho/frontend/app/routes/psychologist/session.tsx`.

In the `past`/`missed` branch, replace the `{/* TODO: EDG-47 — whiteboard snapshot */}` comment with a conditional section:
- If `appointment.whiteboardSnapshotUrl` is non-null, render a section with a heading "Whiteboard Snapshot" and an `<img>` tag whose `src` is the `whiteboardSnapshotUrl` value. Apply reasonable Tailwind classes for width and rounded corners (match the visual style of the page).
- If `appointment.whiteboardSnapshotUrl` is null, render nothing for this section (no placeholder text needed — EDG-47 is out of scope).

No changes to the `Appointment` model are needed; `whiteboardSnapshotUrl: string | null` already exists in both frontend and backend models.

---

## Files to Create

| Path | Description |
|------|-------------|
| `/Users/artem/uni/psycho/backend/src/features/attachments/impressions-psycho-routes.test.ts` | Backend tests for `GET /api/clients/:clientId/appointments/:appointmentId/impressions` (psychologist side) |
| `/Users/artem/uni/psycho/frontend/app/test/past-appointment.test.tsx` | Frontend tests for the past-appointment branch of `session.tsx` |

## Files to Modify

| Path | What changes |
|------|-------------|
| `/Users/artem/uni/psycho/frontend/app/routes/psychologist/session.tsx` | Replace the `TODO: EDG-47` comment with the conditional whiteboard snapshot `<img>` block |

---

## Tests

### What to test

**Backend**

- `GET /api/clients/:clientId/appointments/:appointmentId/impressions` (psycho route):
  - Happy path — past appointment, returns `{ impressions: [...] }` with all impression entries for that appointment (all client impressions are visible to the psychologist per Decision 24)
  - Returns `{ impressions: [] }` when no impressions exist
  - Returns `404` when `appointmentId` does not belong to the requesting psychologist
  - Returns `404` when `clientId` URL param does not match the appointment's client
  - Returns `403` when `Helpsycho-User-Role` is `client`
  - Returns `401` when unauthenticated

**Frontend**

- `Session` component — past-appointment branch:
  - Renders date and time range heading for a past appointment
  - Renders the `AppointmentNotesPanel` component (stub present in DOM)
  - Renders the `AppointmentRecommendationsPanel` component (stub present in DOM)
  - Calls `impressionService.getPsychoList` with the correct `clientId` and `appointmentId` on mount for past status
  - Renders impression text returned by `impressionService.getPsychoList`
  - Shows loading spinner (via `ImpressionList`) while impression fetch is in progress
  - Shows "No impressions yet." when `getPsychoList` returns an empty array
  - Renders whiteboard snapshot `<img>` element when `appointment.whiteboardSnapshotUrl` is non-null
  - Does not render whiteboard snapshot section when `appointment.whiteboardSnapshotUrl` is null
  - Does not call `impressionService.getPsychoList` when appointment status is `upcoming` (guard condition)
  - Renders the `missed` status through the same past branch (no "Start Appointment" button)

---

## Out of Scope

- Whiteboard snapshot capture/saving (EDG-47) — only rendering an already-stored URL is in scope.
- Any changes to the `AppointmentNotesPanel`, `AppointmentRecommendationsPanel`, or `ImpressionList` components themselves.
- Client-side past appointment detail view (EDG-24).
- Any email notifications.
- The `session-attachment.tsx` route — it contains stale TODOs but they are not part of EDG-21.
