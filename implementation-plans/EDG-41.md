# Implementation Plan: EDG-41 — Psycho Can Add a Registered Client by Entering Their Email

## Overview

A psychologist can add a registered client to their client list by entering the client's email address. The backend has partial scaffolding (`clientRoutes`, `findClientByEmail`, `linkClientToPsycho`) but it has several defects and is never mounted. The frontend clients page uses fake data and `ClientForm` collects unrelated fields. This ticket requires: fixing the backend defects (mounting routes, fixing the SQL query, adding duplicate-link protection, returning proper error responses), and wiring the frontend clients page to call the real API with a new email-only "Add Client" dialog.

---

## Issues & Questions

1. **`clientRoutes` is never mounted.** `backend/src/features/clients/routes.ts` exports `clientRoutes` but it is never registered on the app in `backend/src/config/app.ts`. The entire `/clients` API surface is unreachable. Mounting it is a prerequisite for this ticket.

2. **Duplicate link prevention is missing.** The `psychologist_clients` table has no `PRIMARY KEY` or `UNIQUE` constraint on `(client_id, psycho_id)`. The current `linkClientToPsycho` service will insert duplicate rows if the psychologist submits the same email twice. A unique constraint must be added.

3. **`findClients` query references a non-existent `c.id` column.** The `clients` table only has `user_id`. The join `pc.client_id = c.id` will fail at runtime. Must be changed to `pc.client_id = c.user_id`.

4. **`POST /` returns `{ client: null }` on not-found instead of a `400`.** Per scope: "If the user is not registered, the psychologist sees an error: 'No account found for this email. Ask your client to register first.'" Must return `400`, not `200` with null payload.

5. **`Helpsycho-User-Role` header missing from CORS `allowHeaders`.** In `backend/src/config/app.ts`, CORS only allows `['Content-Type', 'Authorization']`. Browser preflight will block the custom role header.

6. **Frontend `api.ts` Axios instance does not send the `Helpsycho-User-Role` header.** Without this header, the backend sets role to `rolesless`, and `onlyPsychoRequest` returns 403.

7. **`ClientForm` collects irrelevant fields.** The existing component collects username, phone, telegram, instagram — not relevant for the add-by-email flow. A new email-only dialog is needed.

---

## Implementation Steps

### 1. Database — Add unique constraint to `psychologist_clients`

Create `backend/src/migrations/<timestamp>_add-unique-constraint-psychologist-clients.sql`:

```sql
ALTER TABLE psychologist_clients
    ADD CONSTRAINT psychologist_clients_pkey PRIMARY KEY (psycho_id, client_id);
```

Run via `bun run migrate` in `backend/`.

### 2. Backend — Fix CORS allowed headers

In `backend/src/config/app.ts`, update the `allowHeaders` array:

```ts
allowHeaders: ['Content-Type', 'Authorization', 'Helpsycho-User-Role'],
```

### 3. Backend — Fix `findClients` SQL query

In `backend/src/features/clients/services.ts`, fix the join condition and return user fields:

```sql
SELECT u.id, u.name, u.email, u.image
FROM clients c
INNER JOIN psychologist_clients pc ON pc.psycho_id = ${params.psychoId} AND pc.client_id = c.user_id
INNER JOIN "user" u ON u.id = c.user_id
```

### 4. Backend — Fix `findClientByEmail` to return user fields

Update `findClientByEmail` to alias `user_id` as `id` and join `"user"` for profile fields:

```sql
SELECT c.user_id AS id, u.email, u.name, u.image
FROM clients c
INNER JOIN "user" u ON u.id = c.user_id
WHERE u.email = ${email}
```

Update the `Client` model in `backend/src/features/clients/models.ts`:

```ts
export interface Client {
    id: string      // = user_id
    email: string
    name: string
    image: string | null
}
```

### 5. Backend — Fix `POST /clients` route

In `backend/src/features/clients/routes.ts`, update the `POST /` handler:

1. Validate the request body contains `email`; return `400` if missing.
2. Call `findClientByEmail(email)`.
3. If `null`, return `400` with `{ error: 'ClientNotFound', message: 'No account found for this email. Ask your client to register first.' }`.
4. Call `linkClientToPsycho(client.id, psychoId)`. Catch the DB unique-constraint violation and return `400` with `{ error: 'AlreadyLinked', message: 'This client is already in your list.' }`.
5. On success, return `201` with `{ client }`.

### 6. Backend — Mount `clientRoutes` in `app.ts`

In `backend/src/config/app.ts`:

```ts
import { clientRoutes } from '../features/clients/routes'
app.route('/api/clients', clientRoutes)
```

Place after the `setSession` and `setUserRole` middleware calls.

### 7. Frontend — Update `Client` model

In `frontend/app/models/client.ts`, align the model to the real API response. Keep extended fields (appointment stats etc.) as optional so existing fake-data references don't break.

```ts
export interface Client {
    id: string
    name: string
    email: string
    image?: string | null
    // Future fields (populated by later tickets):
    lastSession?: string | null
    nextSession?: string | null
    sessionsCount?: number
}
```

### 8. Frontend — Update `clientService`

In `frontend/app/services/client.service.ts`:

- Update `getList` to pass `Helpsycho-User-Role: psycho` header.
- Add `addByEmail` method:

```ts
addByEmail: (email: string) =>
    api.post<{ client: Client }>('/clients', { email }, {
        headers: { 'Helpsycho-User-Role': 'psycho' }
    }),

getList: () =>
    api.get<{ clients: Client[] }>('/clients', {
        headers: { 'Helpsycho-User-Role': 'psycho' }
    }),
```

### 9. Frontend — Create `AddClientByEmailDialog` component

Create `frontend/app/components/AddClientByEmailDialog.tsx`:

- Renders a shadcn `Dialog` with a single `Input` field for email.
- Uses `react-hook-form` + `zod` (`z.string().email()`), following the same pattern as `ClientForm`.
- On submit, calls `clientService.addByEmail(email)`.
- On `400` with `ClientNotFound`, shows: "No account found for this email. Ask your client to register first."
- On `400` with `AlreadyLinked`, shows: "This client is already in your list."
- On `201` success, closes the dialog and calls an `onSuccess` callback prop.
- Shows a loading state on the submit button during the request.

Use `Dialog`, `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `Input`, `Button` from existing shadcn/ui components.

### 10. Frontend — Wire `clients.tsx` to the real API

Update `frontend/app/routes/psychologist/clients.tsx`:

- Replace `import { fakeClients }` with a `useEffect` + `useState` that calls `clientService.getList()` on mount.
- Add loading and error states.
- Replace `ClientForm mode="add"` usage with `<AddClientByEmailDialog onSuccess={refetchClients} trigger={<Button>Add Client</Button>} />`.
- Update column definitions to use real `Client` fields (`name`, `email`). Render `'-'` for appointment-related columns until backend provides them.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_add-unique-constraint-psychologist-clients.sql` | Adds `PRIMARY KEY (psycho_id, client_id)` to `psychologist_clients` |
| `frontend/app/components/AddClientByEmailDialog.tsx` | Email-only dialog for adding a client; replaces `ClientForm` for the add flow |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Add `Helpsycho-User-Role` to CORS `allowHeaders`; mount `clientRoutes` at `/api/clients` |
| `backend/src/features/clients/routes.ts` | Fix `POST /`: validate input, return `400` on not-found / duplicate, return `201` on success |
| `backend/src/features/clients/services.ts` | Fix `findClients` join; fix `findClientByEmail` to alias `user_id` as `id` and join user fields |
| `backend/src/features/clients/models.ts` | Update `Client` interface to match actual query return shape |
| `frontend/app/models/client.ts` | Align to real API shape; keep extended fields as optional |
| `frontend/app/services/client.service.ts` | Add `addByEmail`; add `Helpsycho-User-Role` header to `getList` and `addByEmail` |
| `frontend/app/routes/psychologist/clients.tsx` | Replace fake data with real API; use `AddClientByEmailDialog`; update columns |

---

## Tests

### What to test

**Backend**
- `findClientByEmail`: returns client with `id` aliased from `user_id` when email exists, returns `null` when no matching email
- `findClients`: returns only clients linked to the given `psychoId` (not clients of other psychologists), returns empty array when no links exist, uses correct `c.user_id` join column
- `POST /api/clients`: happy path — returns 201 with client object, missing `email` body field returns 400, email not found returns 400 with `ClientNotFound` error, duplicate link returns 400 with `AlreadyLinked` error, wrong role header returns 403

**Frontend**
- `AddClientByEmailDialog`: submit button is disabled while loading, shows `ClientNotFound` error message inline, shows `AlreadyLinked` error message inline, calls `onSuccess` callback after 201 response, closes dialog on success

---

## Out of Scope

- Inviting unregistered users by email (EDG-9, EDG-10, EDG-12)
- Email notifications when a client is added
- The client's side of gaining access (EDG-42)
- Removing a client (EDG-43)
- Appointment columns in the client list (EDG-17, EDG-20)
- Real auth context wiring (EDG-6, EDG-7)
