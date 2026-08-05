# Implementation Plan: EDG-15 — Psycho Clients Management

## Overview

Wires the psychologist's client list view to the real backend. Requires: fixing broken migrations to recreate the three core tables, correcting broken SQL queries in the clients feature, adding the `Helpsycho-User-Role` header to the Axios API client, fixing the CORS header allowlist, replacing fake data in the clients route with real API calls, and updating the frontend `Client` model and table columns to match the real API response shape.

---

## Issues & Questions

1. **Migration state is broken.** Migration `20260118183601_delete-app-tables.sql` drops `clients`, `psychologists`, and `psychologist_clients`, and the subsequent file `20260118183620_create-basic-app-tables.sql` is empty. The backend services reference these tables but they don't exist in the DB. A new migration must recreate them.

2. **`psychologist_clients` has no primary key / unique constraint.** Allows duplicate `(client_id, psycho_id)` pairs.

3. **`findClients` query is incorrect.** `INNER JOIN psychologist_clients pc ON ... pc.client_id = c.id` — but `clients` table has no `id` column, only `user_id`. Will fail at runtime.

4. **`findClientById` queries `WHERE id = ${id}`.** The `clients` table has no `id` column. Must query by `user_id`.

5. **`clientExistsInPath` middleware uses `findClientById` with the URL `clientId` param.** After fixing step 4, confirm the URL param (`clientId` = `user.id`) correctly maps to `c.user_id`.

6. **`GET /clients/:clientId` returns a plain text stub.** Must be replaced with a real handler.

7. **`Helpsycho-User-Role` header not in CORS `allowHeaders`.** Browser preflight blocks the custom header.

8. **Frontend `api.ts` Axios instance does not send `Helpsycho-User-Role`.** `onlyPsychoRequest` will return `403` on all guarded endpoints.

9. **Frontend clients list table references fake-data fields** (`upcomingSession`, `lastSession`, `sessionsCount`) that the real API does not return.

10. **`clientRoutes` is never mounted in `app.ts`.** None of the `/clients` endpoints are reachable.

---

## Implementation Steps

### 1. Database — Recreate core tables migration

Create `backend/src/migrations/<timestamp>_recreate-core-tables.sql` via `bun run migration:create -- --name recreate-core-tables`.

```sql
CREATE TABLE IF NOT EXISTS clients (
    user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS psychologists (
    user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS psychologist_clients (
    client_id TEXT REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    psycho_id TEXT REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (client_id, psycho_id)
);
```

Run with `bun run migrate`.

### 2. Backend — Fix `findClientById` service

In `backend/src/features/clients/services.ts`, fix `findClientById` to query by `user_id` and join `"user"` for profile fields:

```sql
SELECT c.user_id, u.name, u.email, u.image, u.created_at
FROM clients c
INNER JOIN "user" u ON u.id = c.user_id
WHERE c.user_id = ${id}
```

### 3. Backend — Fix `findClients` service

Fix the join condition from `c.id` to `c.user_id`, with explicit column aliasing:

```sql
SELECT u.id, u.name, u.email, u.image, u.created_at
FROM clients c
INNER JOIN psychologist_clients pc ON pc.psycho_id = ${params.psychoId} AND pc.client_id = c.user_id
INNER JOIN "user" u ON u.id = c.user_id
```

### 4. Backend — Fix `Client` model

In `backend/src/features/clients/models.ts`, redefine `Client` as a concrete interface matching query output (remove `extends User`):

```ts
export interface Client {
    id: string
    name: string
    email: string
    image: string | null
    created_at: string
}
```

### 5. Backend — Fix CORS `allowHeaders`

In `backend/src/config/app.ts`, add `'Helpsycho-User-Role'` to the `allowHeaders` array:

```ts
allowHeaders: ['Content-Type', 'Authorization', 'Helpsycho-User-Role'],
```

### 6. Backend — Implement `GET /clients/:clientId` route

In `backend/src/features/clients/routes.ts`, replace the plain text stub with a real handler:

- Call `findClientById(c.req.param('clientId'))`.
- If `null`, return `404` with `{ error: 'NotFound' }`.
- Otherwise return `200` with `{ client }`.

### 7. Backend — Mount `clientRoutes` in `app.ts`

In `backend/src/config/app.ts`:

```ts
import { clientRoutes } from '../features/clients/routes'
app.route('/api/clients', clientRoutes)
```

### 8. Frontend — Update `Client` model

In `frontend/app/models/client.ts`, replace the fake-data-oriented model with the real API shape. Keep appointment-related fields as optional to avoid breaking existing references:

```ts
export interface Client {
    id: string
    name: string
    email: string
    image: string | null
    createdAt: string
    // Future fields (populated by EDG-17/EDG-20):
    upcomingAppointment?: string | null
    lastAppointment?: string | null
    appointmentsCount?: number
}
```

### 9. Frontend — Add `Helpsycho-User-Role` header to Axios instance

In `frontend/app/services/api.ts`, export a role setter:

```ts
export function setApiRole(role: 'psycho' | 'client' | null) {
    if (role) {
        api.defaults.headers.common['Helpsycho-User-Role'] = role
    } else {
        delete api.defaults.headers.common['Helpsycho-User-Role']
    }
}
```

In `frontend/app/contexts/auth-context.tsx`, call `setApiRole` after the role is resolved in `checkAuth` (map `'psychologist'` → `'psycho'`, `'client'` → `'client'`) and call `setApiRole(null)` on logout.

### 10. Frontend — Update `clientService`

In `frontend/app/services/client.service.ts`:

- Update `getList` return type to `{ clients: Client[] }` using the real model.
- Update `getById` return type to `{ client: Client }`.
- Remove unsupported optional params (`sortBy`, `sortOrder`, `filterToday`) or keep as future placeholders.

### 11. Frontend — Wire `clients.tsx` to the real API

In `frontend/app/routes/psychologist/clients.tsx`:

- Remove `import { fakeClients }`.
- Import `Client` from `~/models/client`.
- Replace `useState<Client[]>(fakeClients)` with `useEffect` + `useState` calling `clientService.getList()` on mount.
- Add loading state (skeleton/spinner) and error state.
- Update column definitions: remove `upcomingSession`, `lastSession`, `sessionsCount`. Keep `name`, `email`, `actions`. Render `'-'` for any optional fields that are `null`/`undefined`.
- Remove the "show only clients with a session today" filter checkbox and `todayFilterFn` (no API backing).
- Fix action navigation paths: use `useParams<{ role: string }>()` to build `/${role}/clients/${client.id}` correctly.
- Replace `ClientForm mode="add"` with a disabled placeholder (the actual add-client feature is EDG-41).

### 12. Frontend — Update `useCurrentClient` hook

In `frontend/app/hooks/useCurrentClient.ts`, replace the fake-data lookup with a real API call:

- Call `clientService.getById(clientId)` using `useEffect` + `useState`.
- Return `null` during loading or on 404.
- Return type uses the real `Client` model.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_recreate-core-tables.sql` | Recreates `clients`, `psychologists`, `psychologist_clients` with correct schema and composite PK |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Add `Helpsycho-User-Role` to CORS `allowHeaders`; mount `clientRoutes` at `/api/clients` |
| `backend/src/features/clients/models.ts` | Redefine `Client` with concrete fields matching SQL output |
| `backend/src/features/clients/services.ts` | Fix `findClientById` (query by `user_id`); fix `findClients` (correct join + aliases) |
| `backend/src/features/clients/routes.ts` | Implement real `GET /clients/:clientId` handler; fix `POST /` error responses |
| `frontend/app/models/client.ts` | Replace fake-data model with real API shape; keep appointment fields as optional |
| `frontend/app/services/api.ts` | Export `setApiRole` setter; use it for default headers |
| `frontend/app/contexts/auth-context.tsx` | Call `setApiRole` after role resolves in `checkAuth` and on logout |
| `frontend/app/services/client.service.ts` | Update `getList` and `getById` return types; remove unsupported params |
| `frontend/app/routes/psychologist/clients.tsx` | Replace fake data with real API; update columns; remove today filter; fix nav paths |
| `frontend/app/hooks/useCurrentClient.ts` | Replace fake-data lookup with `clientService.getById` API call |

---

## Tests

### What to test

**Backend**
- `findClients`: returns only clients linked to the given `psychoId`, returns empty array when no links, excludes clients linked to a different psychologist, uses `c.user_id` in join (not `c.id`)
- `findClientById`: returns client by `user_id`, returns `null` for unknown id
- `GET /api/clients`: happy path returns client list, non-psycho role returns 403, unauthenticated returns 401
- `GET /api/clients/:clientId`: happy path returns client object, unknown clientId returns 404, non-psycho role returns 403

**Frontend**
- `clients.tsx`: fetches client list on mount, shows loading state before data arrives, shows error state on API failure, renders client `name` and `email` columns
- `useCurrentClient`: returns `null` while loading, returns the correct client object after fetch, returns `null` on 404

---

## Out of Scope

- Adding a client by email (EDG-41)
- Removing a client (EDG-43)
- Appointment columns in the client list (EDG-17, EDG-20)
- Client profile page full wiring
- Full auth context wiring (EDG-6, EDG-7)
- Email notifications
