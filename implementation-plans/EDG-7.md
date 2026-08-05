# Implementation Plan: EDG-7 — User Own Role Management

## Overview

Post-OAuth sign-in role assignment and switching. After Google sign-in, roleless users land on `/role-select` to choose Psychologist or Client. Choosing Psychologist sets their active role and redirects to the psychologist dashboard. Choosing Client with no linked psychologist shows a roleless empty state. Dual-role users see a role switcher in the sidebar, disabled while an active appointment is running.

---

## Issues & Questions

**Question 1 — Active role persistence mechanism.**
Recommended: add `active_role TEXT` column to the `user` table (values: `psycho`, `client`, `NULL` for roleless). Avoids extending better-auth's session table. Must be confirmed before implementation.

**Question 2 — OAuth callback URL.**
`login.tsx` currently hardcodes `callbackURL: 'http://localhost:5173/psychologist'`. After EDG-7, the callback should land on `/role-select`. Confirm this change is in scope (likely already handled by EDG-6).

**Question 3 — `NO_ROLE` typo.**
The backend constant `NO_ROLE` is `'rolesless'` (typo) in `backend/src/constants/index.ts`. Confirm whether correcting it (`'roleless'`) is in scope here or a separate ticket.

**Question 4 — Dual-role switcher disabled during active appointment.**
The switcher must be disabled while the psychologist has an active appointment, but appointment active-state doesn't exist yet (EDG-44). The `useHasActiveAppointment` hook will return `false` unconditionally until EDG-44 lands. Confirm this deferred approach is acceptable.

**Question 5 — Role-selection redirect for users with existing active role.**
If an authenticated user with `active_role = 'psycho'` navigates to `/role-select` directly, should they be silently redirected to their dashboard or see the picker? Plan assumes silent redirect.

**Logical Issue 1 — `auth-context.tsx` hardcodes a fake user.**
`AuthContext` never calls the real session API. EDG-7 requires wiring `checkAuth()` to real `auth.getSession()`. (May already be done by EDG-6 — coordinate sequencing.)

**Logical Issue 2 — `User` model missing `activeRole` field.**
`frontend/app/models/user.ts` defines `UserRole` as `'psychologist' | 'client'` with no `'roleless'` state. Must be updated.

**Logical Issue 3 — `client/login.tsx` has email/password form.**
Architecture is Google OAuth only. `frontend/app/routes/client/login.tsx` has a username/password form that contradicts this. (Likely already deleted by EDG-6 — coordinate.)

---

## Implementation Steps

### 1. Database migration — add `active_role` to the `user` table

Create `backend/src/migrations/<timestamp>_add-active-role-to-user.sql`:

```sql
ALTER TABLE "user"
ADD COLUMN active_role TEXT CHECK (active_role IN ('psycho', 'client')) DEFAULT NULL;
```

`NULL` = roleless user who has not yet selected a role. Values match `PSYCHO_ROLE` / `CLIENT_ROLE` constants.

Run with `bun run migrate` from `backend/`.

---

### 2. Backend — user service: add `getMe` and `setActiveRole`

Modify `backend/src/features/users/service.ts`:

- `getMe(userId: string)`: returns the full `user` row including `active_role`.
- `setActiveRole(userId: string, role: 'psycho' | 'client')`: executes `UPDATE "user" SET active_role = ${role} WHERE id = ${userId}` and returns the updated user row.

Follow the query pattern from `backend/src/features/clients/services.ts`.

---

### 3. Backend — user routes: add `PATCH /api/users/me/role`

Modify `backend/src/features/users/routes.ts` (created in EDG-6):

**`PATCH /api/users/me/role`**
- Middleware: `authorized`
- Request body: `{ role: 'psycho' | 'client' }`
- Validates that `role` is one of the two allowed values; returns `400` if invalid.
- Calls `setActiveRole(user.id, role)`.
- Returns updated user: `{ id, email, name, active_role }`
- No role-guard middleware — explicitly for roleless users picking their first role.

Also update `GET /api/users/me` (from EDG-6) to include `active_role` in the response.

---

### 4. Frontend — update `User` model

Modify `frontend/app/models/user.ts`:
- Extend `UserRole` to `'psychologist' | 'client' | 'roleless'`.
- Add `activeRole: 'psycho' | 'client' | null` to the `User` interface.

---

### 5. Frontend — add user API service

Create `frontend/app/services/user.service.ts`:

```ts
getMe(): api.get<UserApiResponse>('/users/me')
setActiveRole(role: 'psycho' | 'client'): api.patch<UserApiResponse>('/users/me/role', { role })
```

Define `UserApiResponse` locally: `{ id: string; email: string; name: string; active_role: 'psycho' | 'client' | null }`.

---

### 6. Frontend — wire `AuthContext` to real session + add `setActiveRole`

Modify `frontend/app/contexts/auth-context.tsx`:

- Replace hardcoded fake user in `checkAuth()` with:
  1. `auth.getSession()` from `better-auth/react` to check authentication.
  2. `GET /api/users/me` via Axios to get the full user including `active_role`.
- Map API response to `User` model: set `activeRole` from `active_role`.
- Add `setActiveRole(role: 'psycho' | 'client') => Promise<void>` to context: calls `PATCH /api/users/me/role`, then updates local `user` state.
- Update `logout` to call `auth.signOut()` if not already done by EDG-6.
- `AuthContextType` must expose `activeRole: 'psycho' | 'client' | null`.

---

### 7. Frontend — create `/role-select` route

Add to `frontend/app/routes.ts`:
```ts
route('role-select', 'routes/role-select.tsx'),
```

Create `frontend/app/routes/role-select.tsx`:

1. Read `user` and `isLoading` from `useAuth()`.
2. If `isLoading`, show loading state.
3. If `!user`, redirect to `/login`.
4. If `user.activeRole` is non-null, redirect to the appropriate dashboard (see step below).
5. Otherwise, display two large selection cards: **Psychologist** and **Client**.
6. On card click, call `setActiveRole(role)` from context, await, then navigate:
   - `psycho` → `/psycho/clients` (or psychologist dashboard root)
   - `client` → `/client` (client dashboard; the dashboard itself shows the empty state if no psychologist is linked)

Use `Card` from shadcn/ui and `useNavigate` from `react-router`.

---

### 8. Frontend — create client roleless empty-state route

Create `frontend/app/routes/client/no-psychologist.tsx`:

Renders within `client/layout.tsx`. Shows a centered empty state:
> "Your psychologist will send you an invitation. Check your email."

Use the existing `EmptyMessage` component at `frontend/app/components/EmptyMessage.tsx`.

Add route to `frontend/app/routes.ts` under the client layout prefix:
```ts
route('no-psychologist', 'routes/client/no-psychologist.tsx')
```

---

### 9. Frontend — add role switcher to the sidebar

Modify `frontend/app/components/AppSidebar.tsx`:

Add a role-switcher section at the bottom of the sidebar:
- Renders for all authenticated users (every user has both `clients` and `psychologists` rows by design post-sign-up).
- Displays current `activeRole` and a button to switch to the other.
- Is **disabled** when `useHasActiveAppointment()` returns `true`, with a `Tooltip`:
  > "End your active appointment before switching roles."
- On click (when enabled), calls `setActiveRole(otherRole)` from `AuthContext`, then navigates to the other role's dashboard route.

Use `Tooltip` from `frontend/app/components/ui/tooltip.tsx`.

---

### 10. Frontend — add `useHasActiveAppointment` stub hook

Create `frontend/app/hooks/useHasActiveAppointment.ts`:

```ts
export function useHasActiveAppointment() {
  return { hasActiveAppointment: false }
}
```

Returns `false` unconditionally. Will be implemented in EDG-44. Exists now so the sidebar can import it without a blocking dependency.

---

### 11. Frontend — update `useSidebarItems` and `useRoleGuard`

Modify `frontend/app/hooks/useSidebarItems.ts`:
- Drive `availableTo` filtering from `user.activeRole` instead of `user.role`.
- Map `activeRole` (`'psycho'` / `'client'`) to the `'psychologist'` / `'client'` values expected by `availableTo`.

Modify `frontend/app/hooks/useRoleGuard.ts`:
- Add `activeRole` to the return value.
- Use `activeRole` for access checks instead of `role`.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_add-active-role-to-user.sql` | Adds `active_role` column to the `user` table |
| `frontend/app/services/user.service.ts` | Axios wrappers: `getMe`, `setActiveRole` |
| `frontend/app/routes/role-select.tsx` | Role selection page for roleless users after OAuth sign-in |
| `frontend/app/routes/client/no-psychologist.tsx` | Empty state for clients not yet connected to a psychologist |
| `frontend/app/hooks/useHasActiveAppointment.ts` | Stub hook returning `false`; wired into sidebar switcher |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/users/service.ts` | Add `getMe` and `setActiveRole` query functions |
| `backend/src/features/users/routes.ts` | Add `PATCH /api/users/me/role`; update `GET /me` to include `active_role` |
| `backend/src/config/app.ts` | (If not done in EDG-6) mount routes; add `Helpsycho-User-Role` to CORS headers |
| `frontend/app/models/user.ts` | Add `'roleless'` to `UserRole`; add `activeRole: 'psycho' \| 'client' \| null` |
| `frontend/app/contexts/auth-context.tsx` | Wire real session + `/api/users/me`; add `setActiveRole` to context |
| `frontend/app/routes.ts` | Add `role-select` and `no-psychologist` routes |
| `frontend/app/routes/login.tsx` | Change OAuth `callbackURL` to `/role-select` (if not done in EDG-6) |
| `frontend/app/components/AppSidebar.tsx` | Add role switcher with disabled-during-appointment tooltip |
| `frontend/app/hooks/useSidebarItems.ts` | Filter by `activeRole` instead of `role` |
| `frontend/app/hooks/useRoleGuard.ts` | Expose `activeRole`; use it for access checks |

---

## Tests

### What to test

**Backend**
- `PATCH /api/users/me/role`: sets `psycho` role (200), sets `client` role (200), rejects invalid role value (400), unauthenticated request returns 401
- `GET /api/users/me`: response includes `active_role` field (null for roleless users)

**Frontend**
- `role-select.tsx`: redirects to `/login` when user is not authenticated, redirects to the correct dashboard when `activeRole` is already set, calls `setActiveRole` and navigates to `/psycho/clients` on Psychologist card click, calls `setActiveRole` and navigates to `/client` on Client card click
- `AppSidebar` role switcher: switch button is disabled when `useHasActiveAppointment` returns `true`, tooltip appears on hover when disabled, calls `setActiveRole` and navigates to the other role's dashboard when clicked and enabled

---

## Out of Scope

- Google Calendar OAuth scope for psychologists — EDG-6
- Invitation acceptance/decline — EDG-11, EDG-34/35
- Profile management — EDG-8
- Full `useHasActiveAppointment` implementation (polling/WebSocket) — EDG-44
- Google Calendar API integration — EDG-17
- Email notifications on role change
- Admin-level role management

---

## Sequencing Note

EDG-6 must be implemented first. Both tickets touch `auth-context.tsx`, `backend/src/config/app.ts`, `frontend/app/models/user.ts`, and `useRoleGuard.ts`. EDG-7 builds on the real auth session wiring introduced by EDG-6.
