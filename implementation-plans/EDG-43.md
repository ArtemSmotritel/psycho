# Implementation Plan: EDG-43 — Psycho Can Remove a Client from Their List

## Overview

Adds the ability for a psychologist to remove a client from their list. Per Decision 16, removal does not physically delete historical data — it ends the active relationship so no new appointments can be created, while all existing appointments, impressions, and recommendations remain readable. The implementation requires: a migration to add a `disconnected_at` soft-delete column to `psychologist_clients`; a backend `DELETE /clients/:clientId` endpoint that sets that column; mounting `clientRoutes` on the app; a `remove` method in the frontend `clientService`; and a "Remove client" action with a confirmation dialog on the client profile page.

---

## Issues & Questions

**Question 1 — Soft delete vs. hard delete.**
Decision 16 requires historical data to be preserved after removal. The current `psychologist_clients` table has no `disconnected_at` or `active` flag. A hard DELETE would work now (no FK dependencies from appointments yet), but without a soft-delete flag there is no way to distinguish "never linked" from "was linked and removed" for blocking new appointments (EDG-17) or showing historical data. Plan uses **soft delete** (`disconnected_at TIMESTAMPTZ`). Confirm this is acceptable before starting.

**Question 2 — Navigation after removal.**
Plan assumes navigating back to the client list (`/:role/clients`) after confirmation. Confirm if a different destination is expected.

**Question 3 — Active appointment guard.**
Decision 16 says no new appointments can be created after disconnection, but doesn't specify blocking removal if an active appointment exists. Plan does not add this guard (active-appointment feature not yet built). Revisit in EDG-44.

**Logical issue — `clientRoutes` is not mounted on the app.**
`backend/src/features/clients/routes.ts` exports `clientRoutes`, but it is never registered in `backend/src/config/app.ts`. The `DELETE /clients/:clientId` endpoint (and all other client endpoints) are unreachable. Mounting the routes must be included here.

---

## Implementation Steps

### 1. Database — Add `disconnected_at` to `psychologist_clients`

Create `backend/src/migrations/<timestamp>_add-disconnected-at-to-psychologist-clients.sql`:

```sql
ALTER TABLE psychologist_clients
    ADD COLUMN disconnected_at TIMESTAMPTZ DEFAULT NULL;
```

`NULL` = relationship is active. Non-null = client was removed. Existing rows remain active.

Run with `bun run migrate` from `backend/`.

### 2. Backend — Mount `clientRoutes` in `app.ts`

In `backend/src/config/app.ts`:

```ts
import { clientRoutes } from '../features/clients/routes'
app.route('/api/clients', clientRoutes)
```

### 3. Backend — Update `findClients` to exclude disconnected relationships

In `backend/src/features/clients/services.ts`, add `AND pc.disconnected_at IS NULL` to the `findClients` join condition so disconnected clients no longer appear in the psychologist's client list.

### 4. Backend — Add `findClientPsychoRelationship` service function

In `backend/src/features/clients/services.ts`, add:

```ts
findClientPsychoRelationship(clientId: string, psychoId: string)
```

Query:
```sql
SELECT * FROM psychologist_clients
WHERE client_id = ${clientId} AND psycho_id = ${psychoId} AND disconnected_at IS NULL
LIMIT 1
```

Returns the row or `undefined`.

### 5. Backend — Add `unlinkClientFromPsycho` service function

In `backend/src/features/clients/services.ts`, add:

```ts
unlinkClientFromPsycho(clientId: string, psychoId: string): Promise<void>
```

Query:
```sql
UPDATE psychologist_clients
SET disconnected_at = NOW()
WHERE client_id = ${clientId} AND psycho_id = ${psychoId} AND disconnected_at IS NULL
```

If zero rows are updated, returns silently — the route handler interprets this as a 404.

### 6. Backend — Implement `DELETE /clients/:clientId` route

In `backend/src/features/clients/routes.ts`, replace the existing stub with a real handler:

1. Get the authenticated psychologist's `user.id` from `c.get('user')`.
2. Get `clientId` from `c.req.param('clientId')`.
3. Call `findClientPsychoRelationship(clientId, user.id)`. If not found, return `404` with `{ error: 'NotFound' }`.
4. Call `unlinkClientFromPsycho(clientId, user.id)`.
5. Return `200` with `{ success: true }`.

The route is already guarded by `authorized` and `onlyPsychoRequest` middleware at the router level — no additional auth guards needed.

### 7. Frontend — Add `remove` method to `clientService`

In `frontend/app/services/client.service.ts`, add:

```ts
remove: (id: string) => api.delete(`/clients/${id}`)
```

### 8. Frontend — Add "Remove client" action to client profile page

In `frontend/app/routes/psychologist/client-profile.tsx`:

1. Import `ConfirmAction` from `~/components/ConfirmAction`, `UserMinus` from `lucide-react`, `clientService` from `~/services/client.service`, and `useNavigate` from `react-router`.
2. Add `handleRemoveClient` async function:
   - Calls `clientService.remove(client.id)`.
   - On success, navigates to `/${role}/clients` using `useNavigate` and the `:role` param from `useParams`.
   - On error, shows a toast (sonner is already used in this file).
3. Wrap a new `ActionItem` with `ConfirmAction` and append it to the `ActionsSection`:
   - Trigger: `<ActionItem icon={<UserMinus className="h-6 w-6" />} label="Remove client" variant="destructive" />`
   - Title: `"Remove client"`
   - Description: `"This will remove the client from your list. All historical appointments, impressions, and recommendations will be preserved and remain accessible. No new appointments can be created after removal."`
   - Confirm button text: `"Remove"`
   - `onConfirm`: `handleRemoveClient`

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_add-disconnected-at-to-psychologist-clients.sql` | Adds `disconnected_at TIMESTAMPTZ DEFAULT NULL` to `psychologist_clients` |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/config/app.ts` | Mount `clientRoutes` at `/api/clients` |
| `backend/src/features/clients/services.ts` | Add `findClientPsychoRelationship` and `unlinkClientFromPsycho`; update `findClients` to filter `disconnected_at IS NULL` |
| `backend/src/features/clients/routes.ts` | Implement `DELETE /:clientId` handler; import new service functions |
| `frontend/app/services/client.service.ts` | Add `remove` method |
| `frontend/app/routes/psychologist/client-profile.tsx` | Add "Remove client" `ConfirmAction` + `ActionItem`; add `handleRemoveClient` with post-removal navigation |

---

## Tests

### What to test

**Backend**
- `findClientPsychoRelationship`: returns the row when an active link exists, returns `undefined` when `disconnected_at` is set, returns `undefined` when no link exists
- `unlinkClientFromPsycho`: sets `disconnected_at` to a non-null timestamp for an active relationship, is a no-op (no error) when the relationship is already disconnected
- `findClients`: excludes clients whose `disconnected_at IS NOT NULL`, still returns clients with `disconnected_at IS NULL`
- `DELETE /api/clients/:clientId`: happy path returns 200 with `{ success: true }`, non-existent or already-disconnected link returns 404, non-psycho role returns 403, unauthenticated returns 401

**Frontend**
- `client-profile.tsx` remove action: clicking "Remove client" opens a confirmation dialog, cancelling the dialog does not call `clientService.remove`, confirming calls `clientService.remove` with the correct client id, navigates to `/:role/clients` on success, shows a toast on API error

---

## Out of Scope

- Email notification to the client upon removal (Decision 16 does not mandate it)
- Client-side UI changes after removal (EDG-16)
- Blocking removal during an active appointment (EDG-44)
- Displaying historical data to either party post-removal (EDG-20, EDG-21, EDG-24)
- Changes to the `clients` table itself — the row is preserved
- Fixing the pre-existing `client_id` vs. `user.id` aliasing bug in `psychologist_clients` (tracked separately)
