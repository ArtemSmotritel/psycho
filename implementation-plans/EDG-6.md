# Implementation Plan: EDG-6 — Google OAuth Sign-In with Role Selection

## Overview

Unified Google-only login page where users choose their role (Psychologist or Client) before OAuth. Psychologists get the `calendar.events` scope; clients don't. Role intent is stored in `sessionStorage` to survive the OAuth redirect round-trip.

---

## Issues & Questions

**Pre-existing gap:** `clientRoutes` is never mounted in `app.ts` — plan fixes it as a side effect.

**Logical Issue 1 — `auth-context.tsx` hardcodes a fake user.**
`/frontend/app/contexts/auth-context.tsx` never calls the real session API. EDG-6 must replace the fake user in `checkAuth()` with a real call to `auth.useSession()` from `better-auth/react`. This is load-bearing for the whole ticket.

**Logical Issue 2 — `auth.service.ts` hardcodes `http://localhost:3000`.**
Should use `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'` for production compatibility.

**Logical Issue 3 — Role-specific login pages.**
`frontend/app/routes/psychologist/login.tsx` and `frontend/app/routes/client/login.tsx` are superseded by the unified `/login` page and must be deleted.

---

## Implementation Steps

### 1. Backend — Create `users` routes file

Create `/Users/artem/uni/psycho/backend/src/features/users/routes.ts`.

Expose a single endpoint for this ticket:

**`GET /api/users/me`**
- Middleware: `authorized` (from `/backend/src/middlewares/auth.ts`)
- Returns the authenticated user's profile from the better-auth `user` table.
- Response body: `{ id, email, name, image }`
- Used by the frontend `AuthContext` to bootstrap real session state.

---

### 2. Backend — Mount routes in `app.ts`

Modify `/Users/artem/uni/psycho/backend/src/config/app.ts`:
- Import `clientRoutes` from `../features/clients/routes`.
- Import the new `userRoutes` from `../features/users/routes`.
- Mount `clientRoutes` at `/api/clients` using `app.route('/api/clients', clientRoutes)`.
- Mount `userRoutes` at `/api/users` using `app.route('/api/users', userRoutes)`.
- Add `'Helpsycho-User-Role'` to `allowHeaders` in the CORS config (currently only `['Content-Type', 'Authorization']`).

---

### 3. Frontend — Replace `AuthContext` with real better-auth session

Rewrite `/Users/artem/uni/psycho/frontend/app/contexts/auth-context.tsx`:
- Remove the hardcoded fake user and the unused `login(email, password)` method.
- Import `auth` from `~/services/auth.service` and call `auth.useSession()` to get `{ data: session, isPending }`.
- The context provides:
  - `user`: `{ id, email, name, image }` from better-auth session user
  - `isLoading`: from `isPending`
  - `isAuthenticated`: boolean (`!!session`)
  - `logout`: calls `auth.signOut()`

---

### 4. Frontend — Update `User` model

Modify `/Users/artem/uni/psycho/frontend/app/models/user.ts`:
- Make `role` optional (`role?: UserRole`) to avoid breaking existing components while EDG-7 is not yet implemented.
- Add `image: string | null`.

---

### 5. Frontend — Update `useRoleGuard`

Modify `/Users/artem/uni/psycho/frontend/app/hooks/useRoleGuard.ts`:
- Use optional chaining for `user?.role` to handle users without a role set.

---

### 6. Frontend — Rewrite the unified login page

Rewrite `/Users/artem/uni/psycho/frontend/app/routes/login.tsx` as the single, canonical login page.

The page renders:
1. Heading: "Sign in to Helpsycho"
2. Two role-selection cards: **I'm a Psychologist** and **I'm a Client**. Only one can be selected at a time (controlled state, default none selected).
3. A "Continue with Google" button that is disabled until a role is selected.
4. When the user selects **Psychologist** and clicks Continue, store `intended_role = 'psycho'` in `sessionStorage`, then call:
   ```ts
   auth.signIn.social({
     provider: 'google',
     callbackURL: '/auth/callback',
     scopes: ['https://www.googleapis.com/auth/calendar.events'],
   })
   ```
5. When the user selects **Client** and clicks Continue, store `intended_role = 'client'` in `sessionStorage`, then call:
   ```ts
   auth.signIn.social({
     provider: 'google',
     callbackURL: '/auth/callback',
   })
   ```
6. `callbackURL` uses a relative path (`/auth/callback`) — not a hardcoded `localhost` URL.
7. Show a loading spinner while the OAuth redirect is happening.
8. Use `Card`, `Button` from the existing shadcn/ui components.

**Why `sessionStorage`:** OAuth redirects through Google and back — any in-memory state is lost. The role intent must survive the round-trip.

---

### 7. Frontend — Create the `/auth/callback` route

Create `/Users/artem/uni/psycho/frontend/app/routes/auth-callback.tsx`.

Logic on mount:
1. Read the current session using `auth.useSession()`.
2. If session is still loading, show a loading state.
3. Once resolved:
   - If no session (OAuth failed/cancelled), redirect to `/login`.
   - If session exists, read `intended_role` from `sessionStorage` and clear it.
   - If `intended_role` is not set (direct navigation), redirect to `/login`.
   - If `intended_role` is `psycho`, navigate to `/psycho`.
   - If `intended_role` is `client`, navigate to `/client`.
4. Use `useNavigate` from `react-router`.

Note: post-login role assignment (persisting role to DB) is EDG-7 scope. This callback only handles the redirect.

---

### 8. Frontend — Add the callback route to `routes.ts`

Modify `/Users/artem/uni/psycho/frontend/app/routes.ts`:
```ts
route('auth/callback', 'routes/auth-callback.tsx'),
```
Place at the top level alongside the existing `login` route.

---

### 9. Frontend — Fix `auth.service.ts` base URL

Modify `/Users/artem/uni/psycho/frontend/app/services/auth.service.ts`:
- Replace hardcoded `'http://localhost:3000'` with `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`.
- Add `VITE_API_URL` to the frontend's `.env` configuration.

---

### 10. Frontend — Fix home page copy

Modify `/Users/artem/uni/psycho/frontend/app/routes/home.tsx`:
- Replace any instance of "session" with "appointment" in feature cards and CTA copy (per Decision 3).

---

### 11. Frontend — Delete stale role-specific login pages

- Delete `/Users/artem/uni/psycho/frontend/app/routes/psychologist/login.tsx`
- Delete `/Users/artem/uni/psycho/frontend/app/routes/client/login.tsx`

Neither is registered in `routes.ts`, so no route config cleanup is needed.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/features/users/routes.ts` | Hono router; exposes `GET /api/users/me` |
| `frontend/app/routes/auth-callback.tsx` | Post-OAuth landing page; reads `intended_role` from `sessionStorage` and redirects |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Mount `userRoutes` + `clientRoutes`; add `Helpsycho-User-Role` to CORS headers |
| `frontend/app/routes/login.tsx` | Rewrite: role cards + "Continue with Google" with conditional scopes |
| `frontend/app/routes.ts` | Add `auth/callback` route |
| `frontend/app/contexts/auth-context.tsx` | Wire real `auth.useSession()`, real logout |
| `frontend/app/models/user.ts` | Make `role` optional; add `image: string \| null` |
| `frontend/app/hooks/useRoleGuard.ts` | Use optional chaining for `user?.role` |
| `frontend/app/services/auth.service.ts` | Replace hardcoded localhost with `VITE_API_URL` env var |
| `frontend/app/routes/home.tsx` | Replace "session" copy with "appointment" |

## Files to Delete

| Path | Reason |
|------|--------|
| `frontend/app/routes/psychologist/login.tsx` | Superseded by unified `/login` page |
| `frontend/app/routes/client/login.tsx` | Email/password form, incompatible with Google-only auth |

---

## Tests

### What to test

**Backend**
- `GET /api/users/me`: authenticated user returns `{ id, email, name, image }`, unauthenticated returns 401

**Frontend**
- `auth-callback.tsx`: redirects to `/login` when no session exists, redirects to `/psycho` when `intended_role` is `'psycho'`, redirects to `/client` when `intended_role` is `'client'`, redirects to `/login` when `intended_role` is missing from `sessionStorage`
- `login.tsx`: "Continue with Google" button is disabled until a role is selected, clicking Continue for Psychologist stores `'psycho'` in `sessionStorage`, clicking Continue for Client stores `'client'` in `sessionStorage`

---

## Out of Scope

- Role assignment after sign-in (EDG-7)
- Google Calendar API integration — actual event creation (EDG-17)
- Invitation-linked sign-up flow (EDG-12)
- No new DB migrations needed — `user` table is managed entirely by better-auth
- The `clientRoutes` functional stubs (e.g. `PUT /:clientId` returning plain text) — pre-existing gap, out of scope beyond the mount fix
