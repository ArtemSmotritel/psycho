# Implementation Plan: EDG-53 — Client Dashboard

## Issues & Questions

**Questions**

1. **"Pending recommendations" definition**: The ticket description says the dashboard should show "pending recommendations." The codebase has recommendations with an optional `reaction.done` field. Does "pending" mean recommendations with `reaction.done === false` or `null`, or recommendations with no reaction row at all, or any recommendation regardless of reaction status? This needs clarification before implementing the "pending recommendations" section.

2. **"Progress from all connected psychologists"**: The linear-tickets.md note says the dashboard should include "progress from all connected psychologists." The existing progress timeline (EDG-52) is scoped per psychologist-client pair. Should the client dashboard show a merged/aggregated impression timeline across all psychologists, or a count/summary, or a link to the per-psychologist timeline?

3. **Active appointment display**: If the client has an active appointment, should the dashboard's "next appointment" card show it prominently (e.g. with a "Join Now" CTA), or just display it inline in the upcoming list?

4. **Recommendation count cap**: Should the "pending recommendations" section show all pending recommendations from all psychologists, or only the N most recent?

**Logical / Business Logic Issues**

5. **`dashboard.ts` model is psychologist-oriented**: The existing `/Users/artem/uni/psycho/frontend/app/models/dashboard.ts` and `/Users/artem/uni/psycho/frontend/app/services/dashboard.service.ts` define a `DashboardStatistics` interface and hit `/api/dashboard/statistics`. These exist for the psychologist dashboard (EDG-54), not the client. The client dashboard at `/Users/artem/uni/psycho/frontend/app/routes/client/dashboard.tsx` is currently a stub. A new dedicated backend endpoint (e.g. `GET /api/client/dashboard`) is needed — it must not reuse the psychologist dashboard route/model.

6. **The `listAppointmentsForClient` service already exists** and returns `AppointmentWithPsycho[]` for the global appointment list. The dashboard can call this to derive counts.

7. **"Pending recommendations" across all psychologists**: The current `GET /api/appointments/:appointmentId/recommendations` route is per-appointment. There is no existing service function to retrieve recommendations across all of a client's appointments. A new service function is needed for this aggregation.

---

## Overview

EDG-53 wires the currently-stub client dashboard (`/client`) to real data. The implementation adds a dedicated backend endpoint `GET /api/client/dashboard` that returns, in one response: the client's next upcoming appointment, a list of pending (unreacted or not-done) recommendations across all appointments, and appointment summary counts. The frontend route replaces its hardcoded placeholders with live data fetched from this endpoint, presenting three main sections: Next Appointment, Pending Recommendations, and Appointments Overview.

---

## Implementation Steps

### 1. Backend — New service functions in appointments

Add two new functions to `/Users/artem/uni/psycho/backend/src/features/appointments/services.ts`:

- `findNextUpcomingAppointmentForClient(clientId: string): Promise<AppointmentWithPsycho | null>` — queries for the single soonest appointment with `status = 'upcoming'` (or `'active'`) for the given client, joining the `user` table for `psychoName`.

- `countAppointmentsForClient(clientId: string): Promise<{ upcoming: number; past: number; active: number }>` — returns status counts for the client's appointments.

### 2. Backend — New service function in attachments

Add one new function to `/Users/artem/uni/psycho/backend/src/features/attachments/services.ts`:

- `listPendingRecommendationsForClient(clientId: string): Promise<AttachmentWithReaction[]>` — queries all recommendations across all appointments belonging to `clientId` where either no reaction row exists or `reaction.done = false`. Orders by `attachments.created_at DESC`. Joins through `appointments` to scope by `client_id = clientId`. Uses the existing `ATTACHMENT_SELECT` constant pattern plus the reaction JSON expression already present in `listAttachmentsWithReactions`.

### 3. Backend — New client-dashboard feature directory

Create the directory `/Users/artem/uni/psycho/backend/src/features/client-dashboard/` with:

**`/Users/artem/uni/psycho/backend/src/features/client-dashboard/routes.ts`**

Register one route: `GET /` (mounted at `/api/client/dashboard`). The handler:

1. Reads `user.id` from `c.get('user')`.
2. Calls `findNextUpcomingAppointmentForClient(user.id)`.
3. Calls `listPendingRecommendationsForClient(user.id)`.
4. Calls `countAppointmentsForClient(user.id)`.
5. Returns `200` with shape:
   ```
   {
     nextAppointment: AppointmentWithPsycho | null,
     pendingRecommendations: AttachmentWithReaction[],
     appointmentCounts: { upcoming: number, active: number, past: number }
   }
   ```
6. Uses `authorized` + `onlyClientRequest` middleware, following the pattern in `client-routes.ts`.

### 4. Backend — Register the new route in app.ts

In `/Users/artem/uni/psycho/backend/src/config/app.ts`, import `clientDashboardRoutes` and add:

```ts
app.route('/api/client/dashboard', clientDashboardRoutes)
```

### 5. Backend — Tests

Create `/Users/artem/uni/psycho/backend/src/features/client-dashboard/routes.test.ts`.

Follow the patterns in `appointments/routes.test.ts` and `clients/routes.test.ts`: use `insertTestUser`, `asUser`, `linkClientToPsycho`, `createAppointment`, `startAppointment`, `endAppointment`, `createAttachment`, `upsertReaction` from the existing test infrastructure.

### 6. Frontend — New TypeScript model

Add a new interface to `/Users/artem/uni/psycho/frontend/app/models/dashboard.ts` (extend the file rather than replace it, to avoid disrupting any future psychologist dashboard work):

```typescript
export interface ClientDashboardData {
    nextAppointment: AppointmentWithPsycho | null
    pendingRecommendations: AttachmentWithReaction[]
    appointmentCounts: {
        upcoming: number
        active: number
        past: number
    }
}
```

Import `AppointmentWithPsycho` from `~/models/appointment` and `AttachmentWithReaction` from `~/models/attachment`.

### 7. Frontend — New service call

Add a new method to `/Users/artem/uni/psycho/frontend/app/services/dashboard.service.ts`:

```typescript
getClientDashboard: () => api.get<ClientDashboardData>('/client/dashboard')
```

Import `ClientDashboardData` from `~/models/dashboard`.

### 8. Frontend — Rewrite the client dashboard route

Replace the stub body of `/Users/artem/uni/psycho/frontend/app/routes/client/dashboard.tsx` with a fully wired component.

The component should:

1. Call `useRoleGuard(['client'])` at the top.
2. On mount (via `useEffect`), call `dashboardService.getClientDashboard()` and set state for `data`, `isLoading`, and `error`.
3. Render three sections using `Card`/`CardHeader`/`CardContent` components:
   - **Next Appointment**: If `nextAppointment` is null, show `EmptyMessage` ("No upcoming appointments"). Otherwise show the formatted start/end time (using `format` from `date-fns`), the psychologist name, status, and a `Link` to `/client/appointments/${nextAppointment.id}`. If `nextAppointment.status === 'active'`, also show a "Join Now" link-button pointing to `/client/appointments/${nextAppointment.id}/live`.
   - **Pending Recommendations**: If empty, show `EmptyMessage` ("No pending recommendations"). Otherwise render each recommendation using the existing `RecommendationCard` component with `role="client"` and callbacks for `onToggleDone` and `onSubmitComment` calling `recommendationService.react(...)` then refreshing the dashboard data.
   - **Appointments Overview**: Show counts (`upcoming`, `active`, `past`) from `appointmentCounts`. Include a `Link` to `/client/appointments` labeled "View all appointments".
4. Show a loading state while `isLoading` is true.
5. Show an error message if `error` is set.
6. Use `AppPageHeader` with `text="Dashboard"`.

---

## Files to Create

| Path | Description |
|------|-------------|
| `/Users/artem/uni/psycho/backend/src/features/client-dashboard/routes.ts` | Hono route for `GET /api/client/dashboard`, client-role only |
| `/Users/artem/uni/psycho/backend/src/features/client-dashboard/routes.test.ts` | Backend integration tests for the client dashboard endpoint |

## Files to Modify

| Path | Change |
|------|--------|
| `/Users/artem/uni/psycho/backend/src/features/appointments/services.ts` | Add `findNextUpcomingAppointmentForClient` and `countAppointmentsForClient` service functions |
| `/Users/artem/uni/psycho/backend/src/features/attachments/services.ts` | Add `listPendingRecommendationsForClient` service function |
| `/Users/artem/uni/psycho/backend/src/config/app.ts` | Import and mount `clientDashboardRoutes` at `/api/client/dashboard` |
| `/Users/artem/uni/psycho/frontend/app/models/dashboard.ts` | Add `ClientDashboardData` interface |
| `/Users/artem/uni/psycho/frontend/app/services/dashboard.service.ts` | Add `getClientDashboard` method |
| `/Users/artem/uni/psycho/frontend/app/routes/client/dashboard.tsx` | Replace stub with wired implementation |

---

## Tests

### What to test

**Backend**

- `GET /api/client/dashboard` — happy path: returns `nextAppointment`, `pendingRecommendations`, and `appointmentCounts` for authenticated client with linked appointments and recommendations.
- `GET /api/client/dashboard` — `nextAppointment` is null when client has no upcoming/active appointments.
- `GET /api/client/dashboard` — `pendingRecommendations` contains only recommendations where `done = false` or no reaction exists; excludes recommendations where `done = true`.
- `GET /api/client/dashboard` — `pendingRecommendations` is empty array `[]` when no recommendations exist.
- `GET /api/client/dashboard` — does not return recommendations from appointments belonging to a different client.
- `GET /api/client/dashboard` — `appointmentCounts` correctly reflects upcoming, active, and past appointment counts.
- `GET /api/client/dashboard` — returns `401` for unauthenticated request.
- `GET /api/client/dashboard` — returns `403` when called with `Helpsycho-User-Role: psycho` header.
- `listPendingRecommendationsForClient` (service function) — excludes recommendations with `done = true`, includes those with `done = false`, includes those with no reaction row.

**Frontend**

- `ClientDashboard` component: renders loading state while fetch is in progress.
- `ClientDashboard` component: renders error message when API call fails.
- `ClientDashboard` component: renders "No upcoming appointments" empty state when `nextAppointment` is null.
- `ClientDashboard` component: renders next appointment card with correct date, time, and psychologist name when appointment exists.
- `ClientDashboard` component: renders "Join Now" link when the next appointment's status is `active`.
- `ClientDashboard` component: renders "No pending recommendations" empty state when array is empty.
- `ClientDashboard` component: calls `dashboardService.getClientDashboard` on mount.

---

## Out of Scope

- Psychologist dashboard (EDG-54) — separate ticket.
- Progress timeline (EDG-52) — separate ticket; the dashboard only links to the appointments list per Decision 26.
- Email notifications of any kind.
- Any changes to the `/api/dashboard/statistics` route or the existing `DashboardStatistics` model (those belong to EDG-54).
- Pagination of pending recommendations on the dashboard.
- Per-psychologist filtering of pending recommendations (the client dashboard is global, per Decision 6).
