# Implementation Plan: EDG-54 — Psychologist Dashboard

## Issues & Questions

**Questions**

1. **"Recent clients" definition**: The ticket description says "quick access to recent clients" — the definition of "recent" is unspecified. This plan assumes "clients who had the most recent past appointment" (sorted by last `ended_at` desc), capped at 5 entries.

2. **Pending reschedule and cancellation requests**: These are listed as dashboard widgets, but the reschedule request (EDG-26) and cancellation request (EDG-59) tickets have not been implemented yet — their database tables do not exist. This plan opts to **include count widgets that return `0`** until the underlying tables exist, so the UI is complete and no rework is required later.

3. **Active appointment indicator**: Should it show a "Go to appointment" link navigating to the live appointment page (`/psycho/clients/:clientId/appointments/:appointmentId/live`)? This plan includes the link, as it is the most useful behavior and is consistent with how the sidebar `useHasActiveAppointment` hook is already used.

**Logical / Business Logic Issues**

4. **Stale `dashboard.ts` model**: The existing `frontend/app/models/dashboard.ts` uses old naming (`Session`, `sessions`, `completed`, `cancelled`). These stale model types and service call must be **fully replaced**, not updated, because they reference stale concepts (`Session` instead of `Appointment`, `cancelled` state which does not exist per Decision 5).

5. **`frontend/app/models/dashboard.ts` imports `Session` from `./session`**: Changing the dashboard model will surface this dependency. The `session.ts` model must not be modified (it may still be consumed elsewhere), but the new dashboard model must not import from it.

---

## Overview

EDG-54 builds the psychologist's home dashboard — a real, data-driven aggregated view replacing the current placeholder at `/psycho`. It requires a new backend endpoint `GET /api/psycho/dashboard` that returns: upcoming appointments (next 5, with client names), active appointment if any, total client count, counts of upcoming and past appointments, and recent clients (last 5 by most recently ended appointment). On the frontend, the existing placeholder dashboard route is replaced with a component that fetches data from the new endpoint and renders it in sectioned cards: an active appointment banner, a stat summary row, an upcoming appointments list, and a recent clients list.

---

## Implementation Steps

### 1. Backend — Service: Dashboard query

Create a new file **`/Users/artem/uni/psycho/backend/src/features/dashboard/services.ts`**.

Add a function `getPsychoDashboard(psychoId: string)` that returns:

```
{
  totalClients: number,
  totalUpcomingAppointments: number,
  totalPastAppointments: number,
  activeAppointment: AppointmentWithClient | null,
  upcomingAppointments: AppointmentWithClient[],   // next 5, ordered by start_time ASC
  recentClients: Client[],                         // last 5 by most-recently ended appointment
}
```

Use the existing `STATUS_EXPR` pattern from `appointments/services.ts` for status calculation. Join `"user"` on `client_id` to produce `clientName`. The function executes multiple focused queries:

- `COUNT(DISTINCT pc.client_id)` from `psychologist_clients` where `psycho_id = psychoId AND disconnected_at IS NULL` for `totalClients`.
- Count upcoming appointments (CASE expression computed status = 'upcoming') for `totalUpcomingAppointments`; also fetch the first 5 ordered by `start_time ASC` with `clientName` for the list.
- `COUNT(*)` of past appointments (where `ended_at IS NOT NULL`) for `totalPastAppointments`.
- Active appointment (reuse `findActiveAppointmentByPsycho` result shape) joined with `"user"` to include `clientName`.
- Recent clients: select the 5 most recently active clients — join `psychologist_clients`, `"user"` on `client_id`, order by the latest `ended_at` across their appointments with this psychologist, `LIMIT 5`.

### 2. Backend — Route: `GET /api/psycho/dashboard`

Create **`/Users/artem/uni/psycho/backend/src/features/dashboard/routes.ts`**.

- Mount under `psychoDashboardRoutes` using `new Hono()`.
- Apply `authorized` and `onlyPsychoRequest` middlewares.
- Single `GET /` handler: calls `getPsychoDashboard(user.id)` and returns `200` with the full object.

### 3. Backend — Register route in `app.ts`

In `/Users/artem/uni/psycho/backend/src/config/app.ts`:

```ts
app.route('/api/psycho/dashboard', psychoDashboardRoutes)
```

### 4. Backend — Tests

Create **`/Users/artem/uni/psycho/backend/src/features/dashboard/routes.test.ts`**.

Follow the existing pattern from `appointments/routes.test.ts` and `clients/routes.test.ts`: use `insertTestUser`, `asUser`, `linkClientToPsycho`, `createAppointment`, `startAppointment`, `endAppointment`.

See the Tests section below for case coverage.

### 5. Frontend — Model: Replace stale dashboard types

Replace **`/Users/artem/uni/psycho/frontend/app/models/dashboard.ts`** with new types:

```typescript
import type { AppointmentWithClient } from './appointment'
import type { Client } from './client'

export interface PsychoDashboard {
    totalClients: number
    totalUpcomingAppointments: number
    totalPastAppointments: number
    activeAppointment: AppointmentWithClient | null
    upcomingAppointments: AppointmentWithClient[]
    recentClients: Client[]
}
```

Do not import from `session.ts`. The old `DashboardStatistics`, `SessionDistribution`, and `ClientActivity` interfaces are removed.

### 6. Frontend — Service: Replace stale dashboard service

Replace the body of **`/Users/artem/uni/psycho/frontend/app/services/dashboard.service.ts`**:

```typescript
import { api } from './api'
import type { PsychoDashboard } from '~/models/dashboard'

export const dashboardService = {
    getPsychoDashboard: () => api.get<PsychoDashboard>('/psycho/dashboard'),
}
```

The old `getStatistics` call (pointing to `/dashboard/statistics` which never existed on the backend) is removed.

### 7. Frontend — Route: Psychologist Dashboard

Replace **`/Users/artem/uni/psycho/frontend/app/routes/psychologist/dashboard.index.tsx`** with a fully wired component.

The component:
- On mount, calls `dashboardService.getPsychoDashboard()`.
- Renders a loading state while fetching (e.g. `<p className="text-muted-foreground">Loading...</p>`).
- Renders an error message on failure.
- On success, renders four sections:

**Active appointment banner** (only shown when `activeAppointment !== null`):
- A visually distinct card/alert with the client's name, scheduled time range, and a "Go to appointment" link navigating to `/psycho/clients/{clientId}/appointments/{appointmentId}/live`.

**Stats row** (always shown):
- Three stat cards: "Total Clients" (`totalClients`), "Upcoming Appointments" (`totalUpcomingAppointments`), "Past Appointments" (`totalPastAppointments`).
- Use `Card`, `CardHeader`, `CardTitle`, `CardContent`.

**Upcoming appointments** (next 5):
- A card containing a list. Each row shows: client name, date/time range (use `format` from `date-fns`), and a link to the appointment detail (`/psycho/clients/{clientId}/appointments/{appointmentId}`).
- Empty state: "No upcoming appointments."

**Recent clients** (last 5):
- A card containing a list. Each row shows: client name and a link to their profile (`/psycho/clients/{clientId}`).
- Empty state: "No clients yet."

Follow the component patterns from `sessions.tsx` (data fetching with `useState`/`useEffect`), `clients.tsx` (error and loading state).

---

## Files to Create

| Path | Description |
|------|-------------|
| `/Users/artem/uni/psycho/backend/src/features/dashboard/services.ts` | Backend service with `getPsychoDashboard` query |
| `/Users/artem/uni/psycho/backend/src/features/dashboard/routes.ts` | `GET /api/psycho/dashboard` route handler |
| `/Users/artem/uni/psycho/backend/src/features/dashboard/routes.test.ts` | Backend integration tests for the dashboard endpoint |
| `/Users/artem/uni/psycho/frontend/app/test/psychologist-dashboard.test.tsx` | Frontend unit tests for the dashboard route component |

---

## Files to Modify

| Path | Change |
|------|--------|
| `/Users/artem/uni/psycho/backend/src/config/app.ts` | Import `psychoDashboardRoutes` and mount at `/api/psycho/dashboard` |
| `/Users/artem/uni/psycho/frontend/app/models/dashboard.ts` | Replace stale interfaces with `PsychoDashboard` |
| `/Users/artem/uni/psycho/frontend/app/services/dashboard.service.ts` | Replace `getStatistics` with `getPsychoDashboard` pointing to `/psycho/dashboard` |
| `/Users/artem/uni/psycho/frontend/app/routes/psychologist/dashboard.index.tsx` | Replace placeholder with fully wired dashboard component |

---

## Tests

### What to test

**Backend**

- `GET /api/psycho/dashboard`:
  - Happy path: returns `200` with correct shape when psychologist has clients, upcoming appointments, a past appointment, and an active appointment. Assert `totalClients`, `upcomingAppointments` length, `recentClients` length, `activeAppointment` is not null.
  - Returns `200` with zeroed counts and empty arrays when psychologist has no clients and no appointments.
  - `upcomingAppointments` is limited to 5 when more than 5 exist; they are ordered ascending by `start_time`.
  - `recentClients` is limited to 5.
  - `activeAppointment` is `null` when no appointment has been started but not ended.
  - `activeAppointment` is populated (includes `clientName`) when exactly one appointment is active.
  - Returns `401` for unauthenticated request.
  - Returns `403` when `Helpsycho-User-Role: client` header is sent.

**Frontend**

- `DashboardOverview` (the dashboard route component):
  - Shows loading state while `getPsychoDashboard` is pending.
  - Renders stat cards with correct counts after successful fetch.
  - Renders active appointment banner with client name and a link to the live appointment page when `activeAppointment` is non-null.
  - Does not render active appointment banner when `activeAppointment` is null.
  - Renders upcoming appointment list items with client name and formatted date.
  - Renders "No upcoming appointments." empty state when `upcomingAppointments` is empty.
  - Renders recent clients list with client names.
  - Renders "No clients yet." empty state when `recentClients` is empty.
  - Shows an error message when `getPsychoDashboard` rejects.

---

## Out of Scope

- Pending reschedule request counts (EDG-26 — not yet implemented; schema does not exist).
- Pending cancellation request counts (EDG-59 — not yet implemented; schema does not exist).
- Any mutation actions from the dashboard (creating appointments, adding clients).
- Client dashboard (EDG-53 — separate ticket).
- Sorting or pagination of the dashboard lists — these are fixed-length preview lists.
- Notifications or real-time updates to the dashboard.
