# Implementation Plan: EDG-52 — Client Progress Timeline

## Issues & Questions

**Questions**

1. **Psychologist-only or also client-visible?** The ticket description says "chronological view of all client impressions across all appointments within a psychologist-client pair." The existing `client-progress.tsx` route is placed entirely under `psycho/clients/:clientId/progress` — meaning it is psychologist-facing only. This plan assumes the feature is **psychologist-facing only**, consistent with the existing route.

2. **Pagination vs. infinite scroll.** The existing fake-data implementation uses per-page pagination with 3 items per page by appointment. The ticket mentions a "chronological view of all entries," which could mean flat impression entries (not grouped by appointment). This plan assumes a **flat chronological list of all individual impression entries**, with client-side pagination matching the existing 3-per-page pattern.

3. **Appointment grouping.** This plan **preserves the appointment-grouping layout** already present in the route, since that is the only concrete reference, but wires it to real data.

**Logical / Business Logic Issues**

4. **`client-progress.tsx` uses old `Session` model from `~/models/session.ts`.** The `session.ts` file is legacy, predating the renaming to "appointment." The route imports `Session` and `AttachmentType` from `~/models/session`. The new implementation must migrate to `Appointment` (`~/models/appointment.ts`) and `Attachment` (`~/models/attachment.ts`). The old `session.ts` model file should not be extended or used for new logic.

5. **The existing route references `getSessionName()` from `~/utils/utils`.** This utility almost certainly uses the legacy `Session` shape. It must be replaced with `format` from `date-fns`, consistent with how `client-sessions.tsx` formats dates.

6. **The existing route links to `/psycho/clients/${clientId}/sessions/${session.id}` (old path).** The registered route in `frontend/app/routes.ts` uses `appointments/:appointmentId`, not `sessions/:sessionId`. All links must be updated.

---

## Overview

EDG-52 wires the psychologist-facing client progress timeline (`/psycho/clients/:clientId/progress`) to real API data. Currently the route is fully built in the frontend but populated entirely with hardcoded fake data using the legacy `Session` model. The work involves: (1) adding a new backend service function that fetches all impressions for a given psychologist-client pair across all past/active appointments; (2) adding a new backend route accessible only to the psychologist; (3) registering that route in `app.ts`; (4) adding a corresponding method to `impressionService` on the frontend; and (5) rewriting `client-progress.tsx` to fetch real data, migrating it from the legacy `Session` / fake-data pattern to the real `Appointment` + `Attachment` data models.

---

## Implementation Steps

### 1. Backend service — `listImpressionsForClientByPsycho`

Add a new exported function to `/Users/artem/uni/psycho/backend/src/features/attachments/services.ts`.

This function receives `clientId: string` and `psychoId: string` and returns all impression-type attachments that belong to any appointment in the `psycho_id = psychoId AND client_id = clientId` pair, ordered by `a.created_at ASC`.

Return type: an array of `AttachmentWithAppointment` objects (see step 2 for the model).

The SQL query JOINs `attachments a` to `appointments ap` on `a.appointment_id = ap.id`, filters `ap.psycho_id = psychoId AND ap.client_id = clientId AND a.type = 'impression'`, and SELECTs `ATTACHMENT_SELECT` columns plus `ap.start_time AS "appointmentStartTime"` and `ap.id AS "appointmentId"`. Order by `a.created_at ASC`.

Follow the `ATTACHMENT_SELECT` constant pattern already in that file for the image/audio sub-selects.

### 2. Backend model — `AttachmentWithAppointment`

Add a new interface to `/Users/artem/uni/psycho/backend/src/features/attachments/models.ts`:

```ts
export interface AttachmentWithAppointment extends Attachment {
    appointmentStartTime: string   // ISO timestamp from appointments.start_time
}
```

### 3. Backend route — progress route for psychologist

Create `/Users/artem/uni/psycho/backend/src/features/attachments/progress-psycho-routes.ts`.

This follows exactly the same structure as `impressions-psycho-routes.ts`:
- Uses `authorized` + `onlyPsychoRequest` middlewares.
- `GET /` handler: reads `clientId` from `c.req.param('clientId')`, verifies `isClientLinkedAndActive(clientId, user.id)` — return `400 ClientNotLinked` if false. Calls `listImpressionsForClientByPsycho(clientId, user.id)` and returns `{ impressions }` with status `200`.

Route URL when mounted: `/api/clients/:clientId/progress/impressions`.

### 4. Register route in `app.ts`

Modify `/Users/artem/uni/psycho/backend/src/config/app.ts`:
- Import `progressPsychoRoutes` from `'../features/attachments/progress-psycho-routes'`.
- Add: `app.route('/api/clients/:clientId/progress/impressions', progressPsychoRoutes)`

### 5. Frontend model — `AttachmentWithAppointment`

Add to `/Users/artem/uni/psycho/frontend/app/models/attachment.ts`:

```typescript
export interface AttachmentWithAppointment extends Attachment {
    appointmentStartTime: string
}
```

### 6. Frontend service — `impressionService.getPsychoProgressList`

Modify `/Users/artem/uni/psycho/frontend/app/services/impression.service.ts`:

Add a new method:
```typescript
getPsychoProgressList: (clientId: string) =>
    api.get<{ impressions: AttachmentWithAppointment[] }>(
        `/clients/${clientId}/progress/impressions`,
    ),
```

Import `AttachmentWithAppointment` from `~/models/attachment`.

### 7. Frontend route — rewrite `client-progress.tsx`

Modify `/Users/artem/uni/psycho/frontend/app/routes/psychologist/client-progress.tsx`:

**7a.** Remove all fake data — delete the `fakeProgressData` constant and all its contents.

**7b.** Remove the legacy `Session` / `AttachmentType` import from `~/models/session` and `getSessionName` import from `~/utils/utils`.

**7c.** Update imports: `AttachmentWithAppointment` from `~/models/attachment`, `impressionService` from `~/services/impression.service`, `useState` and `useEffect` from React, `format` from `date-fns`.

**7d.** Add a `useRoleGuard` call at the component top level.

**7e.** Introduce data-fetching state in the `ClientProgress` component:
```typescript
const [impressions, setImpressions] = useState<AttachmentWithAppointment[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```
Use a `useEffect` on `params.clientId` to call `impressionService.getPsychoProgressList(params.clientId)`.

**7f.** Group impressions by appointment. After fetching, derive a list of unique appointments (sorted by `appointmentStartTime`) with their impressions, replacing the old per-`Session` grouping. Each group: `{ appointmentId, appointmentStartTime, impressions: AttachmentWithAppointment[] }`.

**7g.** Update `SessionInTimeline` component (rename to `AppointmentInTimeline`):
- Replace `session: Session` prop with `appointmentId: string`, `appointmentStartTime: string`, and `impressions: AttachmentWithAppointment[]`.
- Replace header link from `/psycho/clients/${clientId}/sessions/${session.id}` to `/psycho/clients/${clientId}/appointments/${appointmentId}`.
- Replace `getSessionName(session)` with `format(new Date(appointmentStartTime), 'PPP HH:mm')`.
- Remove the "Recommendations" sub-section (EDG-52 scope is impressions only). Keep only the "Impressions" sub-list, rendering each impression's `text` and `createdAt` timestamp.

**7h.** Update the pagination logic to paginate over the derived appointment groups rather than fake sessions, retaining the 3-per-page `ITEMS_PER_PAGE` constant.

**7i.** Show loading and error states using the same inline text pattern as `client-sessions.tsx`.

**7j.** Empty state: keep the existing `<EmptyMessage>` component with updated copy: "No impressions yet" / "No impressions have been submitted for any appointment."

---

## Files to Create

| Path | Description |
|------|-------------|
| `/Users/artem/uni/psycho/backend/src/features/attachments/progress-psycho-routes.ts` | New Hono router: `GET /` returns all impressions for a psychologist-client pair across all appointments. Requires `psycho` role. |
| `/Users/artem/uni/psycho/backend/src/features/attachments/progress-routes.test.ts` | Backend integration tests for `GET /api/clients/:clientId/progress/impressions`. |
| `/Users/artem/uni/psycho/frontend/app/test/client-progress.test.tsx` | Frontend unit tests for the rewritten `ClientProgress` component. |

---

## Files to Modify

| Path | Change |
|------|--------|
| `/Users/artem/uni/psycho/backend/src/features/attachments/models.ts` | Add `AttachmentWithAppointment` interface. |
| `/Users/artem/uni/psycho/backend/src/features/attachments/services.ts` | Add `listImpressionsForClientByPsycho(clientId, psychoId)` service function. |
| `/Users/artem/uni/psycho/backend/src/config/app.ts` | Import and register `progressPsychoRoutes` at `/api/clients/:clientId/progress/impressions`. |
| `/Users/artem/uni/psycho/frontend/app/models/attachment.ts` | Add `AttachmentWithAppointment` interface. |
| `/Users/artem/uni/psycho/frontend/app/services/impression.service.ts` | Add `getPsychoProgressList(clientId)` method. |
| `/Users/artem/uni/psycho/frontend/app/routes/psychologist/client-progress.tsx` | Full rewrite: remove fake data, migrate from `Session` to real `Attachment` + `Appointment` models, fetch from real API, fix all broken links (`sessions/` → `appointments/`), remove "Recommendations" sub-section. |

---

## Tests

### What to test

**Backend**

- `GET /api/clients/:clientId/progress/impressions`:
  - Happy path: authenticated psychologist with a linked client and multiple past appointments that each have impressions — returns `200` with all impressions across all appointments, ordered by `createdAt ASC`, each item includes `appointmentStartTime`.
  - Empty: client has appointments but no impressions submitted — returns `200` with an empty array.
  - `ClientNotLinked`: the `clientId` in the URL does not belong to the psychologist's client list — returns `400 ClientNotLinked`.
  - Isolation: impressions from other psychologist-client pairs do not appear in the response (IDOR check).
  - Role guard: authenticated as `client` role → `403`.
  - Unauthenticated → `401`.

**Frontend**

- `ClientProgress` component:
  - Shows loading state while fetch is pending.
  - Shows error message when `impressionService.getPsychoProgressList` rejects.
  - Shows `EmptyMessage` when fetch resolves with empty array.
  - Renders appointment group headers and impression text/timestamps when data is present.
  - Pagination: shows only up to `ITEMS_PER_PAGE` appointment groups per page; next/previous buttons advance page.
  - Sort toggle: switching from "Oldest First" to "Newest First" re-orders appointment groups and resets to page 0.
  - Appointment group header links to the correct path `/psycho/clients/:clientId/appointments/:appointmentId`.

---

## Out of Scope

- Client-facing equivalent of this view (no corresponding route exists under `client/`).
- Impression detail page per individual impression entry.
- Recommendations or notes in the timeline (EDG-52 is impressions only; the fake-data "Recommendations" section should be removed).
- Pagination on the server side (client-side pagination is sufficient).
- Any changes to the `~/models/session.ts` or `~/utils/utils.ts` files beyond removing their use from this one route.
