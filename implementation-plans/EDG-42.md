# Implementation Plan: EDG-42 — Added Client Receives Access and Is Linked to the Psychologist Immediately

## Overview

EDG-42 is the client-side consequence of EDG-41: once a psychologist adds a registered user by email, that user's client record is linked to the psychologist's workspace immediately and the psychologist sees the new client in their list. No action is required on the client's side — the link is instant (no invitation acceptance step). The implementation involves: fixing the backend `POST /clients` route to correctly identify the client by `user_id`, adding a unique constraint on `psychologist_clients`, mounting `clientRoutes` in `app.ts`, adding the `Helpsycho-User-Role` header to the Axios instance, and wiring the psychologist client list to the real API so the newly added client appears immediately.

---

## Issues & Questions

1. **`psychologist_clients.client_id` receives `client.id` which is undefined.** `findClientByEmail` returns a `clients` row whose only column is `user_id`. The route then calls `linkClientToPsycho(client.id, ...)`, but `client.id` is `undefined`. The fix: alias `c.user_id AS id` in the `findClientByEmail` query, or use `client.user_id` explicitly.

2. **No unique constraint on `psychologist_clients`.** Calling `POST /` twice with the same email creates duplicate rows. A composite primary key on `(client_id, psycho_id)` is required.

3. **`clientRoutes` is not mounted in `app.ts`.** None of the `/clients` endpoints are reachable.

4. **`POST /` returns `{ client: null }` on not-found instead of an error.** Must return `404` with a human-readable message.

5. **Duplicate linking is silent.** No check for an existing link before inserting. Must catch the unique-constraint violation or do a pre-check.

6. **`Helpsycho-User-Role` header not sent by the frontend.** The Axios `api` instance has no default for this header. `onlyPsychoRequest` will always return `403`.

7. **CORS `allowHeaders` missing `Helpsycho-User-Role`.** Browser preflight will block the custom header.

---

## Implementation Steps

### 1. Database — Add unique constraint to `psychologist_clients`

Create `backend/src/migrations/<timestamp>_add-unique-constraint-psychologist-clients.sql`:

```sql
ALTER TABLE psychologist_clients
    ADD CONSTRAINT psychologist_clients_pkey PRIMARY KEY (client_id, psycho_id);
```

Run with `bun run migrate` from `backend/`.

### 2. Backend — Fix `findClientByEmail` column aliasing

In `backend/src/features/clients/services.ts`, update the query to alias `user_id` as `id` and join `"user"` for profile fields:

```sql
SELECT c.user_id AS id, u.email, u.name, u.image
FROM clients c
INNER JOIN "user" u ON u.id = c.user_id
WHERE u.email = ${email}
```

Also fix `findClients` to use the correct join condition:

```sql
SELECT u.id, u.email, u.name, u.image
FROM clients c
INNER JOIN psychologist_clients pc ON pc.psycho_id = ${params.psychoId} AND pc.client_id = c.user_id
INNER JOIN "user" u ON u.id = c.user_id
```

Update `Client` model in `backend/src/features/clients/models.ts` to explicitly define returned fields: `id: string`, `email: string`, `name: string`, `image: string | null`.

### 3. Backend — Add `isClientLinkedToPsycho` service function

In `backend/src/features/clients/services.ts`, add:

```ts
isClientLinkedToPsycho(clientId: string, psychoId: string): Promise<boolean>
```

Query:
```sql
SELECT 1 FROM psychologist_clients WHERE client_id = ${clientId} AND psycho_id = ${psychoId}
```

Returns `true` if a row exists, `false` otherwise.

### 4. Backend — Fix `POST /clients` route

In `backend/src/features/clients/routes.ts`:

1. Validate `email` in request body; return `400` if missing.
2. Call `findClientByEmail(email)`.
3. If `null`, return `404` with `{ error: 'NotFound', message: 'No account found for this email. Ask your client to register first.' }`.
4. Call `isClientLinkedToPsycho(client.id, psychoId)`. If `true`, return `400` with `{ error: 'AlreadyLinked', message: 'This client is already in your list.' }`.
5. Call `linkClientToPsycho(client.id, psychoId)`.
6. Return `201` with `{ client }`.

### 5. Backend — Mount `clientRoutes` in `app.ts`

In `backend/src/config/app.ts`:

```ts
import { clientRoutes } from '../features/clients/routes'
app.route('/api/clients', clientRoutes)
```

### 6. Frontend — Inject `Helpsycho-User-Role` header

In `frontend/app/services/api.ts`, export a setter:

```ts
export function setApiRole(role: 'psycho' | 'client' | null) {
    if (role) {
        api.defaults.headers.common['Helpsycho-User-Role'] = role
    } else {
        delete api.defaults.headers.common['Helpsycho-User-Role']
    }
}
```

In `frontend/app/contexts/auth-context.tsx`, call `setApiRole` after the role is resolved in `checkAuth` and on logout.

### 7. Frontend — Add `addByEmail` to `client.service.ts`

In `frontend/app/services/client.service.ts`, add:

```ts
addByEmail: (email: string) => api.post<Client>('/clients', { email })
```

Keep the existing `create` method as-is (reconciled in EDG-8).

### 8. Frontend — Create `AddClientDialog` component

Create `frontend/app/components/AddClientDialog.tsx`:

Props: `trigger: React.ReactNode`, `onSubmit: (email: string) => Promise<void>`

- Single `email` input validated with `z.string().email()`.
- Uses `Dialog` + `Form` from shadcn/ui, matching the pattern of `ClientForm.tsx`.
- Shows error messages inline on `404` (not found) and `400` (already linked).
- Shows loading state on submit button.

### 9. Frontend — Wire `clients.tsx` to the real API

In `frontend/app/routes/psychologist/clients.tsx`:

- Replace `useState<Client[]>(fakeClients)` with `useEffect` + `useState` calling `clientService.getList()` on mount.
- Add loading and error states.
- Replace `ClientForm mode="add"` with `<AddClientDialog trigger={<Button>Add Client</Button>} onSubmit={handleAddClient} />`.
- In `handleAddClient`, call `clientService.addByEmail(email)`, then re-fetch the client list on success.
- Show toast notifications for success, not-found, and already-linked errors.
- Update columns to render `'-'` gracefully when appointment fields are `undefined` or `null`.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_add-unique-constraint-psychologist-clients.sql` | Adds `PRIMARY KEY (client_id, psycho_id)` to `psychologist_clients` |
| `frontend/app/components/AddClientDialog.tsx` | Email-only dialog for adding a client |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/clients/services.ts` | Fix `findClientByEmail` alias; fix `findClients` join; add `isClientLinkedToPsycho` |
| `backend/src/features/clients/models.ts` | Redefine `Client` with explicit fields |
| `backend/src/features/clients/routes.ts` | Fix `POST /`: not-found → `404`, duplicate → `400`, success → `201` |
| `backend/src/config/app.ts` | Mount `clientRoutes`; add `Helpsycho-User-Role` to CORS `allowHeaders` |
| `frontend/app/services/api.ts` | Export `setApiRole` setter; apply it to default headers |
| `frontend/app/contexts/auth-context.tsx` | Call `setApiRole` after role resolves in `checkAuth` and on logout |
| `frontend/app/services/client.service.ts` | Add `addByEmail` method |
| `frontend/app/routes/psychologist/clients.tsx` | Replace fake data + stub handler with real API; use `AddClientDialog`; handle loading/error |

---

## Tests

### What to test

**Backend**
- `isClientLinkedToPsycho`: returns `true` when active link exists, returns `false` when no link exists
- `findClientByEmail`: returns client with `id` (aliased from `user_id`) and profile fields, returns `null` for unknown email
- `POST /api/clients`: happy path — returns 201 with linked client, not-found email returns 404, already-linked client returns 400, missing `email` field returns 400, non-psycho role returns 403

**Frontend**
- `AddClientDialog`: submits email on form submit, shows inline error on 404 (not found) and 400 (already linked), submit button shows loading state during request
- `clients.tsx`: client list refetches after `AddClientDialog` calls `onSubmit` successfully, new client appears in the table without a full page reload

---

## Out of Scope

- Any action required on the client's side to accept the link — the link is immediate, no acceptance step
- Email notifications (belongs to the full invitation flow: EDG-9/EDG-65)
- Full invitation flow (EDG-9, EDG-10, EDG-11, EDG-12, EDG-30–35)
- Client profile editing (EDG-8)
- Removing a client (EDG-43)
- Client-side view of connected psychologists (EDG-16)
- `GET /clients/:clientId` stub implementation (EDG-15)

## Sequencing Note

EDG-41 and EDG-42 heavily overlap in their backend changes. They should be implemented together in a single branch, with EDG-41 covering the backend + add dialog and EDG-42 covering the immediate list refresh / client-side consequence.
