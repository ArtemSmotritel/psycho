# Implementation Plan: Psycho Global Appointments List (`sessions.tsx`)

## Issues & Questions

1. **No backend global list endpoint.** `psycho-routes.ts` only has `GET /` returning the currently active appointment. A separate `GET /all` route is needed to return all appointments for the psycho across all clients, enriched with the client's name.

2. **Legacy `SessionListItemDTO` model.** The table is typed against `SessionListItemDTO` (from `models/session.ts`), which has a `date: Date` field and `notes[]`, `recommendations[]`, `impressions[]` arrays. None of these fields exist in the real `Appointment` model. The component must be retyped to use a new `AppointmentWithClient` interface.

3. **Attachment count columns are unimplementable.** The `Notes`, `Recommendations`, and `Impressions` columns count items in arrays that don't exist in the real data model. Attachments are a future feature. These columns must be removed and replaced with a `Client` column (showing `clientName`).

4. **No loading/error state.** `const [data] = useState(fakeSessionsList)` has no loading or error handling. After wiring real data, a loading state and error fallback are required.

5. **List does not refresh after scheduling.** `handleAddSession` calls `appointmentService.create` but never updates the list. A successful create must trigger a re-fetch.

6. **`useNavigate` called inside a column cell renderer.** The `actions` column calls `useNavigate()` inside its `cell` function, which is a plain function — not a React component. This violates the Rules of Hooks and will cause a runtime error. The fix is to define `columns` inside the `Sessions` component so `navigate` (hoisted to the component body) is in scope via closure.

---

## Overview

`sessions.tsx` is the psychologist's global appointments list — all appointments across all clients. Currently it renders fake data from `fakeSessionsList` using the legacy `SessionListItemDTO` model.

The fix requires:
- One new backend service function and one new route handler (`GET /all` in `psycho-routes.ts`)
- One new frontend model interface (`AppointmentWithClient`)
- One new service method (`appointmentService.getAllForPsycho`)
- A rewrite of `sessions.tsx` to fetch real data, handle loading/error, fix the hook violation in the columns definition, and update the table columns

No migrations are needed. The `appointments` and `user` tables already exist.

---

## Implementation Steps

### 1. Backend — add `listAllAppointmentsForPsycho` service

**File**: `backend/src/features/appointments/services.ts`

Add after `listAppointments`:

```typescript
export async function listAllAppointmentsForPsycho(
    psychoId: string,
): Promise<AppointmentWithClient[]> {
    const rows = await db`
        SELECT
            a.id,
            a.psycho_id AS "psychoId",
            a.client_id AS "clientId",
            a.start_time AS "startTime",
            a.end_time AS "endTime",
            a.status,
            a.google_meet_link AS "googleMeetLink",
            a.created_at AS "createdAt",
            u.name AS "clientName"
        FROM appointments a
        JOIN "user" u ON u.id = a.client_id
        WHERE a.psycho_id = ${psychoId}
        ORDER BY a.start_time DESC
    `
    return rows as AppointmentWithClient[]
}
```

Also add `AppointmentWithClient` to the import from `./models` (see step 2).

### 2. Backend — add `AppointmentWithClient` model

**File**: `backend/src/features/appointments/models.ts`

Add alongside the existing `AppointmentWithPsycho` type:

```typescript
export interface AppointmentWithClient extends Appointment {
    clientName: string
}
```

### 3. Backend — add `GET /all` route to psycho-routes

**File**: `backend/src/features/appointments/psycho-routes.ts`

Import `listAllAppointmentsForPsycho` and `AppointmentWithClient` and add a new handler:

```typescript
psychoAppointmentRoutes.use(authorized, onlyPsychoRequest).get('/all', async (c) => {
    const user = c.get('user')
    const appointments = await listAllAppointmentsForPsycho(user.id)
    return c.json({ appointments }, 200)
})
```

This handler must be registered **before** the existing `GET /` handler, because Hono matches routes in order and `/all` would otherwise be shadowed if a parameterized route existed (it doesn't here, but the convention is to put more-specific routes first).

### 4. Frontend — add `AppointmentWithClient` model

**File**: `frontend/app/models/appointment.ts`

Add alongside `AppointmentWithPsycho`:

```typescript
export interface AppointmentWithClient extends Appointment {
    clientName: string
}
```

### 5. Frontend — add `getAllForPsycho` to `appointmentService`

**File**: `frontend/app/services/appointment.service.ts`

Add to the service object:

```typescript
getAllForPsycho: () =>
    api.get<{ appointments: AppointmentWithClient[] }>('/psycho/appointments/all'),
```

The path is correct: `psychoAppointmentRoutes` is mounted at `/api/psycho/appointments` (`app.ts` line 78), the handler is at `/all` within that router, and the Axios instance uses `baseURL: '/api'`.

### 6. Frontend — rewrite `sessions.tsx`

**File**: `frontend/app/routes/psychologist/sessions.tsx`

**Remove**:
- Import of `fakeSessionsList` from `@/test-data/fakeSessions`
- Import of `getSessionName` from `~/utils/utils`
- Import of `SessionListItemDTO` from `~/models/session`

**Add**:
- Imports: `useEffect`, `useNavigate` (add to existing react-router import), `AppointmentWithClient` from `~/models/appointment`
- State: `const [data, setData] = useState<AppointmentWithClient[]>([])`, `isLoading`, `error`
- `fetchAppointments` function that calls `appointmentService.getAllForPsycho()`, sets `data` on success, sets `error` on failure, always sets `isLoading = false`
- `useEffect(() => { fetchAppointments() }, [])` for initial load
- In `handleAddSession`: call `fetchAppointments()` after the `await appointmentService.create(...)` succeeds (inside the `try` block, after the create)
- Loading state: return `<p className="text-muted-foreground">Loading appointments...</p>` if `isLoading`
- Error state: return `<p className="text-destructive">{error}</p>` if `error`

**Fix hook violation — move `columns` inside the `Sessions` component**:

`useNavigate()` is currently called inside the `actions` cell renderer, which is a plain function. Move the entire `columns` array definition inside the `Sessions` component body, after `const navigate = useNavigate()`. The cell renderer then closes over `navigate` directly:

```typescript
export default function Sessions() {
    const navigate = useNavigate()

    const columns: ColumnDef<AppointmentWithClient>[] = [
        // ...
        {
            id: 'actions',
            cell: ({ row }) => {
                const appointment = row.original
                return (
                    <DropdownMenu>
                        ...
                        <DropdownMenuItem
                            onClick={() => navigate(`/psycho/clients/${appointment.clientId}/appointments/${appointment.id}`)}
                        >
                            View appointment details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate(`/psycho/clients/${appointment.clientId}`)}
                        >
                            View client profile
                        </DropdownMenuItem>
                    </DropdownMenu>
                )
            },
        },
    ]
    // ...
}
```

**Update columns** — replace the entire `columns` definition:

| Column | Field | Notes |
|--------|-------|-------|
| `#` | row index | keep as-is |
| `Start Time` | `startTime` | format with `format(new Date(row.getValue('startTime')), 'PPP HH:mm')` |
| `End Time` | `endTime` | format with `format(new Date(row.getValue('endTime')), 'HH:mm')` |
| `Status` | `status` | keep as-is |
| `Client` | `clientName` | new column, plain string accessor |
| `Actions` | — | keep dropdown; navigation uses `/psycho/clients/...` (hardcoded, no param needed) |

Remove the `Notes`, `Recommendations`, and `Impressions` columns entirely.

**Update `useReactTable`**: change `data` type to `AppointmentWithClient[]`.

**Update the today filter**: `todayFilterFn` is typed against `SessionListItemDTO` and filters on the `date` column — both must change. Retype it as `FilterFn<AppointmentWithClient>` and update `handleShowOnlyToday` to use `id: 'startTime'` instead of `id: 'date'`. The filter function itself becomes:
```typescript
const todayFilterFn: FilterFn<AppointmentWithClient> = (row, columnId) => {
    const value = row.getValue(columnId) as string
    return isToday(new Date(value))
}
```

**Keep**: `SessionForm` trigger button, `DataTablePagination`, `ProtectedRoute` wrapper, the "show only today" checkbox.

---

## Files to Create

None.

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/models.ts` | Add `AppointmentWithClient` interface |
| `backend/src/features/appointments/services.ts` | Add `listAllAppointmentsForPsycho` function |
| `backend/src/features/appointments/psycho-routes.ts` | Add `GET /all` handler |
| `frontend/app/models/appointment.ts` | Add `AppointmentWithClient` interface |
| `frontend/app/services/appointment.service.ts` | Add `getAllForPsycho` method |
| `frontend/app/routes/psychologist/sessions.tsx` | Replace fake data with real API; fix model, columns, hook violation, today filter, loading/error state, refresh on create |

---

## Tests

### Backend

**File**: `backend/src/features/appointments/routes.test.ts` (append, do not modify existing tests)

`describe('GET /api/psycho/appointments/all')` — 4 tests:
- Psycho with appointments → `200 { appointments: [...] }` each item has `clientName`
- Psycho with no appointments → `200 { appointments: [] }`
- Unauthenticated → `401`
- Client role → `403`

### Frontend

No new frontend tests. The component change is a data-wiring fix; integration coverage comes from the backend tests above.

---

## Out of Scope

- Attachment features (notes, recommendations, impressions columns) — future ticket
- Server-side pagination or filtering
- Sorting/filtering by client name
- Per-client scoped view (that is `client-sessions.tsx`, already done)





The bug is in auth-callback.tsx line 36 — the useEffect dependency array includes sessionContext?.setActiveRole.

  Here's the timeline of what happens:

  1. /auth/callback loads. isPending = true → effect fires early, returns.
  2. Session resolves: isPending = false, session present → effect fires:
    - intendedRole = 'psycho' ✓
    - sessionStorage.removeItem('intended_role') — role is now gone from storage
    - sessionContext.setActiveRole('psycho') called (no await)
    - navigate('/psycho') fires
  3. Meanwhile, AuthProvider is still fetching the user (isFetchingUser = true). When userService.getMe() resolves, AuthProvider re-renders — setUser(...) is called — and setActiveRole becomes a new
  function reference (it's an inline async function in the component body, recreated on every render).
  4. The useEffect in auth-callback.tsx sees sessionContext.setActiveRole changed → fires again.
  5. intended_role = sessionStorage.getItem('intended_role') returns null (removed in step 2).
  6. if (!intendedRole) { navigate('/login') } → redirected to login.

  The root cause is two independent issues compounding each other:
  - setActiveRole in AuthProvider is not memoized, so it gets a new identity on every re-render
  - sessionStorage.removeItem is called before navigation, so the second effect run finds nothing

  Fix: memoize setActiveRole with useCallback in auth-context.tsx.

  userService is a module-level constant and setUser/setApiRole are stable setter refs from useState, so the dependency array for the useCallback is empty []:

  // auth-context.tsx
  const setActiveRole = useCallback(async (role: 'psycho' | 'client') => {
      const res = await userService.setActiveRole(role)
      const data = res.data
      setApiRole(data.active_role as 'psycho' | 'client' | null)
      setUser((prev) =>
          prev ? { ...prev, activeRole: data.active_role } : null
      )
  }, [])

  This stabilizes the reference — setActiveRole is created once per AuthProvider mount, so it never causes the effect in auth-callback.tsx to re-fire spuriously.

  Secondary issue worth fixing at the same time: setActiveRole is called without await in auth-callback.tsx, meaning navigate('/psycho') fires before the role is written to the backend and before setApiRole
   sets the Axios role header. Any API call the dashboard makes immediately on mount will have no Helpsycho-User-Role header and will get a 403. The fix is to await it:

  // auth-callback.tsx — make the effect async
  useEffect(() => {
      if (isPending) return
      if (!session) { navigate('/login'); return }

      const intendedRole = sessionStorage.getItem('intended_role')
      sessionStorage.removeItem('intended_role')

      if (!intendedRole) { navigate('/login'); return }

      sessionContext.setActiveRole(intendedRole as any).then(() => {
          if (intendedRole === 'psycho') navigate('/psycho')
          else if (intendedRole === 'client') navigate('/client')
          else navigate('/login')
      })
  }, [isPending, session, navigate, sessionContext.setActiveRole])

  Using .then() instead of async/await inside useEffect avoids the "effect callback can't be async" issue while ensuring navigation only happens after the role is persisted and the Axios header is set.

  Summary of changes needed:

  ┌────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
  │                  File                  │                           Change                            │
  ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ frontend/app/contexts/auth-context.tsx │ Wrap setActiveRole in useCallback(async (...) => {...}, []) │
  ├────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ frontend/app/routes/auth-callback.tsx  │ Chain navigate inside .then() after setActiveRole resolves  │
  └────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘
