# Issues & Questions — All Implementation Plans

1. EDG-7 Q3 — NO_ROLE typo ('rolesless' instead of 'roleless') — still present in backend/src/constants/index.ts, intentionally preserved for consistency.
  2. EDG-23 Issue 3 — Per-psychologist scoped appointment list — intentionally deferred to EDG-16 (not in scope).
  3. EDG-43 Q3 — Active appointment guard on client removal — no guard blocking removal when an active appointment exists. The isClientLinkedAndActive check prevents new appointments after disconnection,
  but the removal itself is unguarded.

---

## EDG-17 — Psycho Can Schedule Appointments

1. **Google Meet auto-generation scope.** `generateGoogleMeet` intent will be stored in DB; actual Google Calendar API integration is deferred. `googleMeetLink` stays `null` for this ticket.

   > **SOLVED AS DESIGNED** — `googleMeetLink` is stored as `null`; no Calendar API integration exists yet.

2. **`endTime` required (Decision 30).** The existing `SessionForm` only has `startTime`. Add `endTime` field with validation `endTime > startTime`.

   > **SOLVED** — `endTime` is required in `SessionForm`; backend validates `endTime > startTime`.

3. **Route renaming.** Rename frontend URL segments from `sessions` to `appointments` in `routes.ts` and related files as part of this ticket.

   > **SOLVED** — All routes use `appointments`; `sessions` segment is gone.

4. **Client picker.** When used from the global sessions page, wire the real client list from the API. When in a client context, default to the current client.

   > **SOLVED** — `SessionForm` fetches the real client list via `clientService.getList()` and defaults to the current client when a `currentClient` is available.

5. **`Session` model is legacy.** Replace with a proper `Appointment` model with `status: 'upcoming' | 'active' | 'past'`.

   > **SOLVED** — `frontend/app/models/appointment.ts` has the full `Appointment` model with status field.

6. **Auth check.** Before creating an appointment, verify the client is still actively linked to the psychologist (not disconnected). Return `400 ClientNotLinked` if not.

   > **SOLVED** — `isClientLinkedAndActive` is called in both `POST /` and `GET /` appointment routes.

7. **Backend URL pattern.** Use `/api/clients/:clientId/appointments` (nested, consistent with client-scoped operations).

   > **SOLVED** — `appointmentRoutes` is mounted at `/api/clients/:clientId/appointments`.

---

## EDG-18 — Psycho Can Change an Appointment

1. **Email notification scope.** Decision 12 states the client receives an email when an appointment is rescheduled. EDG-58 is the dedicated email ticket. The mailer service does not yet exist. The backend handler will have a `// TODO: EDG-58` comment at the trigger site; actual sending is deferred.

   > **SOLVED** — `// TODO: EDG-58 — send rescheduled email to client if startTime or endTime changed` comment is present in the PATCH route.

2. **Which fields are editable.** `startTime`, `endTime`, and `googleMeetLink` — all optional in the PATCH body. The `generateGoogleMeet` flag remains `disabled={mode === 'edit'}`.

   > **SOLVED** — All three fields are optional in the PATCH handler; `mergedStart/End/Link` logic preserves existing values when omitted.

3. **Guard: only `upcoming` appointments can be changed.** Editing a `past` or `active` appointment must be rejected with `400 AppointmentNotEditable`.

   > **SOLVED** — `400 AppointmentNotEditable` is returned for non-upcoming status.

4. **Ownership guard.** The route must verify the appointment belongs to the authenticated psychologist AND the `clientId` from the URL.

   > **SOLVED** — `findAppointmentById(appointmentId, user.id, clientId)` performs ownership check.

5. **`session.tsx` still uses fake data.** Full detail-view wiring is EDG-22. For EDG-18, only the edit form's `onSubmit` callback needs to call the real update API.

   > **SOLVED** — `session.tsx` uses `useCurrentAppointment()` (real API) and calls `appointmentService.update()` on edit submit.

6. **`SessionForm` edit mode has no `googleMeetLink` field.** Add a text input for this field in edit mode only.

   > **SOLVED** — `SessionForm` shows a `googleMeetLink` text input in edit mode; `session.tsx` passes the initial value.

---

## EDG-19 — Psycho Can Delete an Appointment

1. **CORS `allowMethods` missing `'PATCH'`.** The `cors()` call in `backend/src/config/app.ts` has `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']` — `'PATCH'` is missing. This affects EDG-18 (already shipped). Fix as part of this ticket.

   > **SOLVED** — `allowMethods` in `app.ts` now includes `'PATCH'`.

2. **Email notification.** EDG-57 is the dedicated email ticket for appointment deletion notification. Place a `// TODO: EDG-57 — send appointment deleted email to client` comment in the route handler; actual sending is deferred.

   > **SOLVED** — `// TODO: EDG-57 — send appointment deleted email to client` comment exists in the DELETE route.

3. **Only `upcoming` appointments can be deleted.** Decision 23 is clear. Guard with `400 AppointmentNotDeletable` for any other status.

   > **SOLVED** — `400 AppointmentNotDeletable` is returned for non-upcoming status.

4. **`session.tsx` still uses fake data.** Only the delete handler needs to be wired; full detail-view wiring is EDG-22.

   > **SOLVED** — `session.tsx` calls `appointmentService.delete()` on confirmation.

---

## EDG-20 — Psycho Can See Appointments

No issues found.

---

## EDG-22 — Psycho Can Review an Upcoming Appointment

1. **Route param name mismatch.** The existing `routes.ts` uses `:sessionId` for the appointment detail segment, but the CLAUDE.md URL convention is `/:role/clients/:clientId/appointments/:appointmentId/...`. The param name must be corrected to `:appointmentId` as part of this ticket.

   > **SOLVED** — `routes.ts` uses `:appointmentId` throughout.

2. **Missing backend `GET /:appointmentId` route.** The frontend `appointmentService.getById` already exists and references `GET /api/clients/:clientId/appointments/:appointmentId`, but this backend route does not exist yet.

   > **SOLVED** — `GET /:appointmentId` is implemented in `appointmentRoutes`.

3. **Start button scope.** The ticket says "Start button (no time constraint)." Calling the start action transitions `status` to `active`. EDG-44 covers the active appointment UI. **Resolution: implement the actual API call and status transition** — add `PATCH /:appointmentId/start` route and `startAppointment` service. EDG-44 builds the active UI on top.

   > **SOLVED** — `PATCH /:appointmentId/start` route exists and transitions status to `active`.

4. **Decision 22 conflict check.** Decision 22 requires a warning and inline "End previous appointment" button if another appointment is already active. This check is triggered at the Start button — which lives in EDG-22. A new `findActiveAppointmentByPsycho` service query is included in scope.

   > **SOLVED** — The start route calls `findActiveAppointmentByPsycho` and returns `400 AnotherAppointmentActive` with the active appointment ID. `session.tsx` shows an inline error with a "Go to active appointment" button.

5. **`useCurrentSession` uses fake data.** A new `useCurrentAppointment` hook must replace it in `session.tsx`. `useCurrentSession` is left untouched for now.

   > **SOLVED** — `session.tsx` uses `useCurrentAppointment()`. The old `useCurrentSession.ts` file remains but is not imported by any route.

6. **`client-layout.tsx` breadcrumb uses `useCurrentSession`.** Must be updated to use `useCurrentAppointment()`.

   > **SOLVED** — `client-layout.tsx` imports and uses `useCurrentAppointment`.

---

## EDG-23 — Client Can See Appointments

1. **Global list API endpoint.** No backend endpoint for `GET /api/appointments` (client-scoped, all psychologists) exists. Response enriches each appointment with `psychoName` from the `user` table.

   > **SOLVED** — `clientAppointmentRoutes` implements `GET /` at `/api/appointments`, returning `AppointmentWithPsycho[]` including `psychoName`.

2. **Route structure.** Client routes use a flat `/client/...` structure (no `:role` prefix). The new route follows the same pattern: `route('client/appointments', ...)`.

   > **SOLVED** — `routes.ts` has `route('client/appointments', 'routes/client/appointments.tsx')`.

3. **Per-psychologist scoped list.** Deferred to EDG-16 (good-to-have). This ticket implements only the global list.

   > **SKIPPED** — Intentionally deferred to EDG-16; not in scope.

4. **`onlyClientRequest` guard.** The new endpoint uses `onlyClientRequest` (not `onlyPsychoRequest`).

   > **SOLVED** — `clientAppointmentRoutes` uses `authorized, onlyClientRequest`.

5. **Active appointments grouping.** `active` appointments appear in the upcoming column (same as the psychologist-side pattern: `status !== 'past'`).

   > **SOLVED** — `appointments.tsx` filters `a.status !== 'past'` for the upcoming column.

6. **No `disconnected_at` filter.** The global list queries by `client_id` only — historical appointments from disconnected psychologists are included.

   > **SOLVED AS DESIGNED** — The query returns all appointments by `client_id` without filtering by relationship status.

---

## EDG-25 — Client Can Review an Upcoming Appointment

1. **Client appointment detail URL.** The existing `AppointmentCard` in the client appointments list links to `/client/appointments/${appointment.id}` (no `clientId` in URL). The backend's existing `GET /api/clients/:clientId/appointments/:appointmentId` is psychologist-only. A new `GET /api/appointments/:appointmentId` (client-scoped) endpoint is needed, resolving the appointment by the authenticated client's own ID.

   > **SOLVED** — `GET /api/appointments/:appointmentId` is implemented in `clientAppointmentRoutes`, resolving by the session user's own client ID.

2. **`active` status handling.** When a client views an appointment that is now `active`, show a brief message with a "Join Call" button. Redirect to the active participant view is EDG-45 scope.

   > **SOLVED** — `appointment-detail.tsx` uses `<Navigate to={.../live} replace />` for active appointments (implemented in EDG-45).

3. **`past` status.** Show a placeholder — full past view is EDG-24 scope.

   > **SOLVED** — Shows placeholder text "This is a past appointment. Detail view coming in EDG-24."

---

## EDG-41 — Psycho Can Add a Registered Client by Entering Their Email

1. **`clientRoutes` is never mounted.** `backend/src/features/clients/routes.ts` exports `clientRoutes` but it is never registered on the app in `backend/src/config/app.ts`. The entire `/clients` API surface is unreachable. Mounting it is a prerequisite for this ticket.

   > **SOLVED** — Mounted at `/api/clients` in `app.ts`.

2. **Duplicate link prevention is missing.** The `psychologist_clients` table has no `PRIMARY KEY` or `UNIQUE` constraint on `(client_id, psycho_id)`. The current `linkClientToPsycho` service will insert duplicate rows if the psychologist submits the same email twice. A unique constraint must be added.

   > **SOLVED** — Composite primary key `(client_id, psycho_id)` added via migration, plus a pre-insert `isClientLinkedToPsycho` check in `clientRoutes`.

3. **`findClients` query references a non-existent `c.id` column.** The `clients` table only has `user_id`. The join `pc.client_id = c.id` will fail at runtime. Must be changed to `pc.client_id = c.user_id`.

   > **SOLVED** — Fixed in `clients/services.ts`.

4. **`POST /` returns `{ client: null }` on not-found instead of a `400`.** Per scope: "If the user is not registered, the psychologist sees an error: 'No account found for this email. Ask your client to register first.'" Must return `400`, not `200` with null payload.

   > **SOLVED** — Returns `400 ClientNotFound` with the human-readable message.

5. **`Helpsycho-User-Role` header missing from CORS `allowHeaders`.** In `backend/src/config/app.ts`, CORS only allows `['Content-Type', 'Authorization']`. Browser preflight will block the custom role header.

   > **SOLVED** — `'Helpsycho-User-Role'` is in `allowHeaders`.

6. **Frontend `api.ts` Axios instance does not send the `Helpsycho-User-Role` header.** Without this header, the backend sets role to `rolesless`, and `onlyPsychoRequest` returns 403.

   > **SOLVED** — `setApiRole()` in `api.ts` manages the header.

7. **`ClientForm` collects irrelevant fields.** The existing component collects username, phone, telegram, instagram — not relevant for the add-by-email flow. A new email-only dialog is needed.

   > **SOLVED** — A separate email-only `AddClientForm` (or similar) was created for the add-by-email flow.

---

## EDG-42 — Added Client Receives Access and Is Linked to the Psychologist Immediately

1. **`psychologist_clients.client_id` receives `client.id` which is undefined.** `findClientByEmail` returns a `clients` row whose only column is `user_id`. The route then calls `linkClientToPsycho(client.id, ...)`, but `client.id` is `undefined`. The fix: alias `c.user_id AS id` in the `findClientByEmail` query, or use `client.user_id` explicitly.

   > **SOLVED** — `findClientByEmail` now selects `c.user_id AS id`, so `client.id` is defined.

2. **No unique constraint on `psychologist_clients`.** Calling `POST /` twice with the same email creates duplicate rows. A composite primary key on `(client_id, psycho_id)` is required.

   > **SOLVED** — Composite primary key added via migration.

3. **`clientRoutes` is not mounted in `app.ts`.** None of the `/clients` endpoints are reachable.

   > **SOLVED** — Mounted in `app.ts`.

4. **`POST /` returns `{ client: null }` on not-found instead of an error.** Must return `404` with a human-readable message.

   > **SOLVED** — Returns `400 ClientNotFound` with a message.

5. **Duplicate linking is silent.** No check for an existing link before inserting. Must catch the unique-constraint violation or do a pre-check.

   > **SOLVED** — `isClientLinkedToPsycho` pre-check returns `400 AlreadyLinked`.

6. **`Helpsycho-User-Role` header not sent by the frontend.** The Axios `api` instance has no default for this header. `onlyPsychoRequest` will always return `403`.

   > **SOLVED** — `setApiRole()` manages the header in `api.ts`.

7. **CORS `allowHeaders` missing `Helpsycho-User-Role`.** Browser preflight will block the custom header.

   > **SOLVED** — Added to `allowHeaders` in `app.ts`.

---

## EDG-43 — Psycho Can Remove a Client from Their List

**Question 1 — Soft delete vs. hard delete.**
Decision 16 requires historical data to be preserved after removal. The current `psychologist_clients` table has no `disconnected_at` or `active` flag. A hard DELETE would work now (no FK dependencies from appointments yet), but without a soft-delete flag there is no way to distinguish "never linked" from "was linked and removed" for blocking new appointments (EDG-17) or showing historical data. Plan uses **soft delete** (`disconnected_at TIMESTAMPTZ`). Confirm this is acceptable before starting.

> **SOLVED** — Soft delete implemented: migration `20260310130000_add-disconnected-at-to-psychologist-clients.sql` adds the `disconnected_at` column; `unlinkClientFromPsycho` sets it to `NOW()`.

**Question 2 — Navigation after removal.**
Plan assumes navigating back to the client list (`/:role/clients`) after confirmation. Confirm if a different destination is expected.

> **SOLVED** — `client-profile.tsx` navigates to `/${role}/clients` after successful removal.

**Question 3 — Active appointment guard.**
Decision 16 says no new appointments can be created after disconnection, but doesn't specify blocking removal if an active appointment exists. Plan does not add this guard (active-appointment feature not yet built). Revisit in EDG-44.

> **SKIPPED** — No guard is added. New appointments are blocked post-disconnect by `isClientLinkedAndActive`, but removal itself is not blocked if there's an active appointment.

**Logical issue — `clientRoutes` is not mounted on the app.**
`backend/src/features/clients/routes.ts` exports `clientRoutes`, but it is never registered in `backend/src/config/app.ts`. The `DELETE /clients/:clientId` endpoint (and all other client endpoints) are unreachable. Mounting the routes must be included here.

> **SOLVED** — Mounted in `app.ts`.

---

## EDG-44 — Psycho Can Conduct an Active Appointment

1. **`live-session.tsx` is a stub.** Must be fully replaced. The Excalidraw integration stays as a visual placeholder — real-time sync is EDG-46.

   > **SOLVED** — `live-session.tsx` is fully implemented with real Excalidraw, timer, Google Meet alert, "End Appointment" confirm action, and whiteboard sync (EDG-46 also done).

2. **`useHasActiveAppointment` is stubbed to `false`.** Must be wired to a real backend endpoint (has a `TODO: Implement real active appointment detection in EDG-44` comment). Affects sidebar role-switcher disable logic (Decision 14).

   > **SOLVED** — `useHasActiveAppointment` calls `appointmentService.getActiveForPsycho()` against the real `GET /api/psycho/appointments` endpoint.

3. **No global psycho active-appointment endpoint.** `appointmentRoutes` is mounted at `/api/clients/:clientId/appointments` (requires `clientId`), so it can't serve a global check. A new `psycho-routes.ts` file and `/api/psycho/appointments` mount point are needed. `findActiveAppointmentByPsycho` already exists in services.

   > **SOLVED** — `psycho-routes.ts` created and mounted at `/api/psycho/appointments` in `app.ts`.

4. **`session.tsx` already handles `active` status.** It renders a link to the `/live` sub-route. No change needed there.

   > **CONFIRMED** — `session.tsx` renders a "Go to Active Appointment" link/button for active status.

---

## EDG-45 — Client Can Participate in an Active Appointment

1. **"Session ended" modal without WebSockets.** No WebSocket/SSE infrastructure exists (that's EDG-46). Use polling: `setInterval` every 5 seconds calls `getClientAppointmentById`. When status transitions to `past`, show the modal with auto-dismiss (navigate to detail page after 5 seconds).

   > **SOLVED** — Polling is implemented in `live-appointment.tsx` using `setInterval` at 5000ms. On `past` status, `setShowEndedModal(true)` is called and a `setTimeout` auto-navigates after 5 seconds.

2. **`appointment-detail.tsx` active branch change breaks existing tests.** Three test cases in `client-appointment-detail.test.tsx` assert inline active-state content. Replacing that branch with `<Navigate>` requires updating those tests to assert redirect behavior. EDG-45 is the explicit requirement triggering this change, so the test updates are in scope.

   > **SOLVED** — `appointment-detail.tsx` uses `<Navigate to={.../live} replace />` for active status; tests updated accordingly.

3. **Whiteboard stub included.** The same read-only Excalidraw stub as `live-session.tsx` is rendered. Real-time sync is EDG-46.

   > **SUPERSEDED** — Full whiteboard sync (EDG-46) was implemented alongside EDG-45; `live-appointment.tsx` uses `useWhiteboardSync` and `WhiteboardCursorOverlay`.

4. **Client live route URL.** `client/appointments/:appointmentId/live` (no `clientId` — consistent with the rest of the client-side URL structure).

   > **SOLVED** — Route is registered as `route('client/appointments/:appointmentId/live', 'routes/client/live-appointment.tsx')` in `routes.ts`.

---

## EDG-46 — Interactive Whiteboard (Real-Time Drawing, Cursor Sharing, Image Support)

1. **WebSocket URL in the frontend.** The browser cannot set custom headers on a native `WebSocket` upgrade request, so the `Helpsycho-User-Role` header used by all HTTP routes cannot be sent. Role must therefore be inferred server-side from the appointment record: if `userId === appointment.psycho_id` → psychologist; if `userId === appointment.client_id` → client. No role header is needed for the WS route.

   > **SOLVED** — `whiteboard/routes.ts` infers role from `findAppointmentByIdForParticipant`; no role header needed.

2. **Cookie auth in WebSocket upgrade.** The browser automatically sends cookies with same-origin WS upgrades. `better-auth`'s `auth.api.getSession({ headers })` reads cookies. However, Hono's `upgradeWebSocket` factory function runs during the HTTP upgrade phase, before the WS connection is established. The `c.req.raw.headers` at that point must include the cookie. This is standard Bun WebSocket behavior and is assumed to work correctly.

   > **SOLVED** — `auth.api.getSession({ headers: c.req.raw.headers })` is called inside `upgradeWebSocket`; unauthenticated connections are closed in `onOpen` with `ws.close(1008, 'Unauthorized')`.

3. **`Bun.serve` must receive the WebSocket handler.** The current `backend/src/index.ts` calls `Bun.serve({ fetch: app.fetch, port: 3000 })`. To serve WebSockets through Hono+Bun, `Bun.serve` must also receive a `websocket` property from `createBunWebSocket`. This requires modifying `index.ts`.

   > **SOLVED** — `index.ts` imports `websocket` from `config/websocket` and passes it to `Bun.serve({ fetch: app.fetch, websocket, port: 3000 })`.

4. **In-memory room state does not survive backend restarts.** Per Decision 35, appointments stay `active` on disconnect. When the backend restarts during an active appointment, all WS clients disconnect and the room is lost. Reconnecting clients will see an empty whiteboard. The plan addresses this by caching the last known `elements` and `files` in the in-memory room object and replaying them on reconnect — this persists across client disconnects but not backend restarts. This is acceptable for the thesis scope.

   > **SOLVED AS DESIGNED** — `rooms` map stores `lastElements` and `lastFiles`; `scene_init` is replayed on reconnect. Restart-loss is acknowledged and accepted.

5. **VITE_API_URL for WebSocket URL construction.** `api.ts` uses `baseURL: '/api'` (relative). For the WebSocket URL, the frontend must use an absolute URL. The existing `.env` file defines `VITE_API_URL=http://localhost:3000`. The WS URL is derived from this: replace `http` → `ws` and `https` → `wss`, then append `/api/whiteboard/:appointmentId`. This is the only reliable way to construct the WS URL without a Vite proxy for WS upgrades.

   > **SOLVED** — `useWhiteboardSync` constructs the WS URL from `import.meta.env.VITE_API_URL`, replacing `http(s)` with `ws(s)`.

6. **No existing WebSocket infrastructure.** Neither `hono/ws`, `createBunWebSocket`, nor any WS-related code exists anywhere in the codebase. All infrastructure must be created from scratch.

   > **SOLVED** — `backend/src/config/websocket.ts` exports `upgradeWebSocket` and `websocket` from `createBunWebSocket`; `whiteboard/routes.ts` implements the room management logic.

7. **Cursor coordinate space.** Excalidraw's `onPointerUpdate` callback delivers cursor positions in **scene coordinates** (Excalidraw's own coordinate system). To render a cursor overlay at the correct screen position, the receiving client must apply the viewport transform using `excalidrawAPI.getAppState()` fields: `scrollX`, `scrollY`, and `zoom.value`. The formula is: `screenX = (sceneX + scrollX) * zoom.value` and `screenY = (sceneY + scrollY) * zoom.value`. The overlay is a sibling `div` with `position: absolute; inset: 0; pointer-events: none` inside a `position: relative` wrapper around the Excalidraw container.

   > **SOLVED** — `WhiteboardCursorOverlay` component applies the scene-to-screen coordinate transform using `excalidrawAPI.getAppState()`. The container has `position: relative` and the overlay has `position: absolute; inset: 0; pointer-events: none`.
