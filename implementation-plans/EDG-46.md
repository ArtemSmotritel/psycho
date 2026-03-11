# Implementation Plan: EDG-46 — Interactive whiteboard — real-time drawing, cursor sharing, and image support

## Issues & Questions

1. **WebSocket URL in the frontend.** The browser cannot set custom headers on a native `WebSocket` upgrade request, so the `Helpsycho-User-Role` header used by all HTTP routes cannot be sent. Role must therefore be inferred server-side from the appointment record: if `userId === appointment.psycho_id` → psychologist; if `userId === appointment.client_id` → client. No role header is needed for the WS route.

2. **Cookie auth in WebSocket upgrade.** The browser automatically sends cookies with same-origin WS upgrades. `better-auth`'s `auth.api.getSession({ headers })` reads cookies. However, Hono's `upgradeWebSocket` factory function runs during the HTTP upgrade phase, before the WS connection is established. The `c.req.raw.headers` at that point must include the cookie. This is standard Bun WebSocket behavior and is assumed to work correctly.

3. **`Bun.serve` must receive the WebSocket handler.** The current `backend/src/index.ts` calls `Bun.serve({ fetch: app.fetch, port: 3000 })`. To serve WebSockets through Hono+Bun, `Bun.serve` must also receive a `websocket` property from `createBunWebSocket`. This requires modifying `index.ts`.

4. **In-memory room state does not survive backend restarts.** Per Decision 35, appointments stay `active` on disconnect. When the backend restarts during an active appointment, all WS clients disconnect and the room is lost. Reconnecting clients will see an empty whiteboard. The plan addresses this by caching the last known `elements` and `files` in the in-memory room object and replaying them on reconnect — this persists across client disconnects but not backend restarts. This is acceptable for the thesis scope.

5. **VITE_API_URL for WebSocket URL construction.** `api.ts` uses `baseURL: '/api'` (relative). For the WebSocket URL, the frontend must use an absolute URL. The existing `.env` file defines `VITE_API_URL=http://localhost:3000`. The WS URL is derived from this: replace `http` → `ws` and `https` → `wss`, then append `/api/whiteboard/:appointmentId`. This is the only reliable way to construct the WS URL without a Vite proxy for WS upgrades.

6. **No existing WebSocket infrastructure.** Neither `hono/ws`, `createBunWebSocket`, nor any WS-related code exists anywhere in the codebase. All infrastructure must be created from scratch.

7. **Cursor coordinate space.** Excalidraw's `onPointerUpdate` callback delivers cursor positions in **scene coordinates** (Excalidraw's own coordinate system). To render a cursor overlay at the correct screen position, the receiving client must apply the viewport transform using `excalidrawAPI.getAppState()` fields: `scrollX`, `scrollY`, and `zoom.value`. The formula is: `screenX = (sceneX + scrollX) * zoom.value` and `screenY = (sceneY + scrollY) * zoom.value`. The overlay is a sibling `div` with `position: absolute; inset: 0; pointer-events: none` inside a `position: relative` wrapper around the Excalidraw container.

## Overview

EDG-46 adds real-time whiteboard collaboration to the active appointment pages. A new WebSocket route `GET /api/whiteboard/:appointmentId` is added to the backend. It authenticates via session cookie, verifies the user is a participant of an active appointment, manages in-memory rooms (one per `appointmentId`), and broadcasts drawing element changes, image file additions, and cursor positions to all other participants in the room. The frontend gains a new hook `useWhiteboardSync` that manages the WS connection lifecycle, sends local Excalidraw changes to the server, and applies remote changes to the local scene via Excalidraw's imperative API. Both `live-session.tsx` (psychologist) and `live-appointment.tsx` (client) are updated to use this hook, replacing the existing `// TODO: Implement sync logic here` stubs. Remote cursors are rendered as colored overlay dots on the whiteboard container.

## Implementation Steps

### 1. Backend — create `backend/src/config/websocket.ts`

File: `backend/src/config/websocket.ts` (new)

Create and export the Bun WebSocket adapter from Hono. This is a singleton that must be shared between the route handlers (which need `upgradeWebSocket`) and `Bun.serve` (which needs `websocket`):

```ts
import { createBunWebSocket } from 'hono/ws'
import type { ServerWebSocket } from 'bun'

export const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()
```

### 2. Backend — new service `findAppointmentByIdForParticipant`

File: `backend/src/features/appointments/services.ts`

Add after `findAppointmentByIdForClient`. This function looks up an appointment by ID and verifies the given `userId` is either the `psycho_id` or `client_id`:

```ts
export async function findAppointmentByIdForParticipant(
    appointmentId: string,
    userId: string,
): Promise<Appointment | null>
```

Query: `SELECT ... FROM appointments WHERE id = $appointmentId AND (psycho_id = $userId OR client_id = $userId)`. Returns `null` if not found. Returns the full `Appointment` shape (same column aliases as all other appointment queries in this file). Only `id`, `psycho_id`/`psychoId`, `client_id`/`clientId`, `status`, and `google_meet_link`/`googleMeetLink`, `start_time`/`startTime`, `end_time`/`endTime`, `created_at`/`createdAt` are needed.

### 3. Backend — create `backend/src/features/whiteboard/routes.ts`

File: `backend/src/features/whiteboard/routes.ts` (new)

Contains the WebSocket route and in-memory room management.

**Room data structure** (module-level):

```ts
interface RoomConnection {
    ws: ServerWebSocket<unknown>
    userId: string
}

interface Room {
    connections: Set<RoomConnection>
    lastElements: unknown[]
    lastFiles: Record<string, unknown>
}

const rooms = new Map<string, Room>()
```

**WS message protocol** — all messages are JSON strings with a `type` discriminant:

| `type` | Direction | Fields | Description |
|--------|-----------|--------|-------------|
| `elements` | client → server → other clients | `elements: ExcalidrawElement[]` | Full scene element array on change |
| `cursor` | client → server → other clients | `x: number, y: number, userId: string` | Scene-space cursor position |
| `files` | client → server → other clients | `files: Record<string, BinaryFileData>` | Newly added image files |
| `scene_init` | server → client | `elements: unknown[], files: Record<string, unknown>` | Replay on fresh connect |

The `ExcalidrawElement` and `BinaryFileData` types are from `@excalidraw/excalidraw`. The backend treats element and file data as opaque JSON (no type imports needed — use `unknown`).

**Route definition**:

```ts
export const whiteboardRoutes = new Hono()

whiteboardRoutes.get(
    '/:appointmentId',
    upgradeWebSocket(async (c) => {
        const appointmentId = c.req.param('appointmentId')

        // Auth: read session from cookie headers
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session) {
            // Cannot reject here with a status code in Hono WS factory;
            // rejection is done in onOpen by closing the socket.
            // Store rejection reason in closure for onOpen to act on.
            return {
                onOpen(_, ws) {
                    ws.close(1008, 'Unauthorized')
                },
                onMessage() {},
                onClose() {},
            }
        }

        const userId = session.user.id
        const appointment = await findAppointmentByIdForParticipant(appointmentId, userId)

        if (!appointment || appointment.status !== 'active') {
            return {
                onOpen(_, ws) {
                    ws.close(1008, appointment ? 'AppointmentNotActive' : 'NotFound')
                },
                onMessage() {},
                onClose() {},
            }
        }

        // Return valid handlers
        let thisConnection: RoomConnection | null = null

        return {
            onOpen(_, ws) {
                // Ensure raw Bun WS is used for broadcast
                const rawWs = ws.raw as ServerWebSocket<unknown>
                thisConnection = { ws: rawWs, userId }

                if (!rooms.has(appointmentId)) {
                    rooms.set(appointmentId, { connections: new Set(), lastElements: [], lastFiles: {} })
                }
                const room = rooms.get(appointmentId)!
                room.connections.add(thisConnection)

                // Replay last known scene to the new connection
                const initMsg = JSON.stringify({
                    type: 'scene_init',
                    elements: room.lastElements,
                    files: room.lastFiles,
                })
                rawWs.send(initMsg)
            },

            onMessage(event, _ws) {
                if (!thisConnection) return
                const room = rooms.get(appointmentId)
                if (!room) return

                let msg: unknown
                try {
                    msg = JSON.parse(event.data.toString())
                } catch {
                    return
                }

                const parsed = msg as { type: string; elements?: unknown[]; files?: Record<string, unknown>; x?: number; y?: number }

                // Update cached state
                if (parsed.type === 'elements' && Array.isArray(parsed.elements)) {
                    room.lastElements = parsed.elements
                }
                if (parsed.type === 'files' && parsed.files) {
                    room.lastFiles = { ...room.lastFiles, ...parsed.files }
                }

                // Broadcast to all other connections in this room
                const outgoing = JSON.stringify(parsed.type === 'cursor'
                    ? { ...parsed, userId: thisConnection.userId }
                    : parsed)
                for (const conn of room.connections) {
                    if (conn !== thisConnection) {
                        conn.ws.send(outgoing)
                    }
                }
            },

            onClose() {
                if (!thisConnection) return
                const room = rooms.get(appointmentId)
                if (!room) return
                room.connections.delete(thisConnection)
                if (room.connections.size === 0) {
                    rooms.delete(appointmentId)
                }
            },
        }
    }),
)
```

Import `auth` from `utils/auth`, `findAppointmentByIdForParticipant` from `features/appointments/services`, and `upgradeWebSocket` from `config/websocket`. Import `Hono` from `hono`.

### 4. Backend — register whiteboard route in `app.ts`

File: `backend/src/config/app.ts`

Add the import and route registration:

```ts
import { whiteboardRoutes } from '../features/whiteboard/routes'
// ...
app.route('/api/whiteboard', whiteboardRoutes)
```

### 5. Backend — modify `index.ts` to pass the WebSocket handler

File: `backend/src/index.ts`

Import `websocket` from `config/websocket` and add it to `Bun.serve`:

```ts
import { websocket } from 'config/websocket'
// ...
Bun.serve({
    fetch: app.fetch,
    websocket,
    port: 3000,
})
```

### 6. Backend — tests for `findAppointmentByIdForParticipant`

File: `backend/src/features/appointments/routes.test.ts`

Add a describe block for `findAppointmentByIdForParticipant` following the same `bun:test` + `mock()` pattern used throughout that file. See Tests section for case categories.

The WebSocket route itself cannot be unit-tested with the existing `Hono` + inline mock pattern due to the `upgradeWebSocket` upgrade mechanism. A brief note explaining this can be left as a comment in the new describe block placeholder.

### 7. Frontend — add `VITE_API_URL` type declaration

File: `frontend/app/vite-env.d.ts` or `frontend/vite-env.d.ts` (whichever exists, or create `frontend/app/env.d.ts` if neither exists)

Add:
```ts
interface ImportMetaEnv {
    readonly VITE_API_URL: string
}
```

This ensures TypeScript accepts `import.meta.env.VITE_API_URL`. Check if a vite-env.d.ts already exists:

### 8. Frontend — create `useWhiteboardSync` hook

File: `frontend/app/hooks/useWhiteboardSync.ts` (new)

**Signature**:
```ts
export function useWhiteboardSync(appointmentId: string): {
    setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void
    onWhiteboardChange: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void
    onPointerUpdate: (payload: { pointer: { x: number; y: number }; button: string }) => void
    remoteCursors: Map<string, { x: number; y: number }>
    connected: boolean
}
```

Import `ExcalidrawImperativeAPI`, `ExcalidrawElement`, `AppState`, `BinaryFiles` from `@excalidraw/excalidraw`.

**Internal state / refs**:
- `wsRef = useRef<WebSocket | null>(null)` — the WS connection.
- `excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)` — set via `setExcalidrawAPI`.
- `sentFilesRef = useRef<Set<string>>(new Set())` — tracks file IDs already sent to avoid re-sending.
- `[remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number }>>(new Map())`
- `[connected, setConnected] = useState(false)`

**`setExcalidrawAPI`** (stable with `useCallback`): stores `api` in `excalidrawAPIRef.current`. If WS is open and `api` is non-null, nothing extra is needed — `onmessage` will use the ref.

**WS lifecycle** (`useEffect` that runs once on mount with `appointmentId` dep):
1. Construct URL: take `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`, replace leading `http` with `ws` (handles both `http://` → `ws://` and `https://` → `wss://`), append `/api/whiteboard/${appointmentId}`.
2. `const ws = new WebSocket(url)` — cookies are sent automatically.
3. `ws.onopen = () => setConnected(true)`
4. `ws.onclose = () => { setConnected(false); setRemoteCursors(new Map()) }`
5. `ws.onerror = () => setConnected(false)`
6. `ws.onmessage = (event) => { ... }` — parse JSON, dispatch by `type`:
   - `scene_init`: `excalidrawAPIRef.current?.updateScene({ elements: msg.elements })` + `excalidrawAPIRef.current?.addFiles(Object.values(msg.files))`. Also add all file IDs in `msg.files` to `sentFilesRef.current` (avoid re-sending on `onChange`).
   - `elements`: `excalidrawAPIRef.current?.updateScene({ elements: msg.elements })`
   - `files`: `excalidrawAPIRef.current?.addFiles(Object.values(msg.files))`; add received file IDs to `sentFilesRef.current`.
   - `cursor`: `setRemoteCursors(prev => { const next = new Map(prev); next.set(msg.userId, { x: msg.x, y: msg.y }); return next })`
7. `wsRef.current = ws`
8. Cleanup: `() => { ws.close(); wsRef.current = null }`

**`onWhiteboardChange`** (stable with `useCallback`): Called as the Excalidraw `onChange` handler.
1. Send elements: if `wsRef.current?.readyState === WebSocket.OPEN`, send `JSON.stringify({ type: 'elements', elements })`.
2. Detect new files: iterate `Object.keys(files)`. For each `fileId` not in `sentFilesRef.current`, collect the `BinaryFileData`. If any new, send `JSON.stringify({ type: 'files', files: { [fileId]: fileData, ... } })` and add IDs to `sentFilesRef.current`.

Note: `onChange` fires on every state change (mouse move etc.) — do NOT throttle here, but avoid sending if the WS is not open.

**`onPointerUpdate`** (stable with `useCallback`): Called as Excalidraw's `onPointerUpdate` prop.
1. If `wsRef.current?.readyState === WebSocket.OPEN`, send `JSON.stringify({ type: 'cursor', x: payload.pointer.x, y: payload.pointer.y })`.

**Return value**: `{ setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors, connected }`

### 9. Frontend — update `live-session.tsx` (psychologist)

File: `frontend/app/routes/psychologist/live-session.tsx`

**Changes** (do not rewrite the entire file — only replace the `// TODO` comment and the `excalidrawAPI` state/usage):

1. Add import: `import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw'`
2. Add import: `import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'`
3. Remove `const [excalidrawAPI] = useState<any>(null)`.
4. Add: `const { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors } = useWhiteboardSync(appointmentId!)`
5. Replace `excalidrawAPI={excalidrawAPI}` prop with `excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}` (note: Excalidraw's `excalidrawAPI` prop accepts a callback ref, not a state value).
6. Replace `onChange={(_elements, _appState, _files) => { // TODO }}` with `onChange={onWhiteboardChange}`.
7. Add `onPointerUpdate={onPointerUpdate}` prop to `<Excalidraw>`.
8. Wrap the existing `<div className=\"w-full h-full border border-gray-300\">` in a `<div style={{ position: 'relative' }}>`. After the `</Suspense>` closing tag — inside the relative wrapper, after Excalidraw — add the cursor overlay:
   ```tsx
   <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
       {/* Remote cursors rendered in WhiteboardCursorOverlay */}
   </div>
   ```

   Extract cursor rendering to a new shared component `frontend/app/components/WhiteboardCursorOverlay.tsx` (see step 11).

### 10. Frontend — update `live-appointment.tsx` (client)

File: `frontend/app/routes/client/live-appointment.tsx`

**Changes** (same pattern as `live-session.tsx` above):

1. Add import: `import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw'`
2. Add import: `import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'`
3. Add: `const { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors } = useWhiteboardSync(appointmentId!)`
4. Replace `onChange={(_elements, _appState, _files) => { // TODO: Implement sync logic here (EDG-46) }}` with `onChange={onWhiteboardChange}`.
5. Add `excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}` to `<Excalidraw>`.
6. Add `onPointerUpdate={onPointerUpdate}` to `<Excalidraw>`.
7. Wrap Excalidraw container `div` in a `position: relative` div and add `WhiteboardCursorOverlay` with `remoteCursors` prop.

### 11. Frontend — create `WhiteboardCursorOverlay` component

File: `frontend/app/components/WhiteboardCursorOverlay.tsx` (new)

A simple component that renders colored dots for remote cursors. It receives `remoteCursors: Map<string, { x: number; y: number }>` and `excalidrawAPI: ExcalidrawImperativeAPI | null`.

On each render, if `excalidrawAPI` is non-null, call `excalidrawAPI.getAppState()` to get `{ scrollX, scrollY, zoom }`. For each `[userId, { x: sceneX, y: sceneY }]` in `remoteCursors`, compute:
- `screenX = (sceneX + scrollX) * zoom.value`
- `screenY = (sceneY + scrollY) * zoom.value`

Render a `<div key={userId}` with `position: absolute; left: ${screenX}px; top: ${screenY}px; width: 10px; height: 10px; background: <deterministic-color>; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%)`.

Deterministic color: hash `userId` to one of 5–6 preset colors (e.g. a fixed color palette indexed by `userId.charCodeAt(0) % colors.length`).

The overlay container `div` must be `style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}`.

Since `excalidrawAPI.getAppState()` is not reactive, cursor positions will only update when `remoteCursors` state changes (which triggers a re-render). This is sufficient — cursor positions update frequently enough via the `cursor` WS messages.

### 12. Frontend — check/create `vite-env.d.ts`

File: `frontend/app/vite-env.d.ts` (check if exists; create or extend if not)

Ensure `ImportMetaEnv` declares `VITE_API_URL: string`. Check whether `/// <reference types=\"vite/client\" />` already covers it; if not, add an interface augmentation.

### 13. Frontend — tests for `useWhiteboardSync`

File: `frontend/app/test/useWhiteboardSync.test.tsx` (new)

Use `renderHook` from `@testing-library/react`. Mock `global.WebSocket` with a class-based mock that exposes `send`, `close`, and lets tests call `onopen`, `onmessage`, `onclose` manually. See Tests section for case categories.

### 14. Frontend — update existing test files for modified components

Files: `frontend/app/test/live-session.test.tsx` and `frontend/app/test/live-appointment.test.tsx`

**Do not change any existing passing tests.** Add a `vi.mock('~/hooks/useWhiteboardSync', ...)` mock to both test files so they do not attempt to open real WebSocket connections. The mock should return a no-op `setExcalidrawAPI`, `onWhiteboardChange`, `onPointerUpdate`, empty `remoteCursors`, and `connected: false`.

The mock must be added at the top of each file alongside the existing mocks and must not alter any existing test expectations.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/config/websocket.ts` | Bun WebSocket adapter singleton — exports `upgradeWebSocket` and `websocket` |
| `backend/src/features/whiteboard/routes.ts` | Hono WS route at `/:appointmentId`; in-memory room management; broadcast logic |
| `frontend/app/hooks/useWhiteboardSync.ts` | Hook managing WS lifecycle, element/file/cursor sync with Excalidraw imperative API |
| `frontend/app/components/WhiteboardCursorOverlay.tsx` | Renders remote cursor dots over the Excalidraw canvas |
| `frontend/app/test/useWhiteboardSync.test.tsx` | Tests for `useWhiteboardSync` |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/appointments/services.ts` | Add `findAppointmentByIdForParticipant` |
| `backend/src/features/appointments/routes.test.ts` | Add tests for `findAppointmentByIdForParticipant`; note WS route not unit-testable |
| `backend/src/config/app.ts` | Import and register `whiteboardRoutes` at `/api/whiteboard` |
| `backend/src/index.ts` | Import `websocket` from `config/websocket`; pass to `Bun.serve` |
| `frontend/app/routes/psychologist/live-session.tsx` | Replace `excalidrawAPI` state and `onChange` stub with `useWhiteboardSync`; add cursor overlay |
| `frontend/app/routes/client/live-appointment.tsx` | Replace `onChange` stub with `useWhiteboardSync`; add `excalidrawAPI` ref; add cursor overlay |
| `frontend/app/test/live-session.test.tsx` | Add `vi.mock('~/hooks/useWhiteboardSync', ...)` to prevent real WS in tests |
| `frontend/app/test/live-appointment.test.tsx` | Add `vi.mock('~/hooks/useWhiteboardSync', ...)` to prevent real WS in tests |
| `frontend/app/vite-env.d.ts` (or create) | Declare `VITE_API_URL` in `ImportMetaEnv` |

---

## Tests

### What to test

**Backend**

- `findAppointmentByIdForParticipant`:
  - Happy path: user is `psycho_id` → returns the appointment.
  - Happy path: user is `client_id` → returns the appointment.
  - User is neither → returns `null`.
  - Appointment ID does not exist → returns `null`.

Note: The WebSocket route (`whiteboardRoutes`) cannot be tested with the existing `Hono`-based inline mock pattern because `upgradeWebSocket` requires Bun's native HTTP server to perform the protocol upgrade. A comment in `routes.test.ts` should document this and indicate that manual/integration testing is required for the WS route.

**Frontend**

- `useWhiteboardSync`:
  - On mount: `new WebSocket` is called with the correct URL (derived from `VITE_API_URL`).
  - On WS `onopen`: `connected` becomes `true`.
  - On WS `onclose`: `connected` becomes `false`, `remoteCursors` is cleared.
  - `scene_init` message: calls `excalidrawAPI.updateScene` and `excalidrawAPI.addFiles` with the deserialized payload.
  - `elements` message: calls `excalidrawAPI.updateScene({ elements })`.
  - `files` message: calls `excalidrawAPI.addFiles`.
  - `cursor` message: adds entry to `remoteCursors` state with correct `userId` key.
  - `onWhiteboardChange`: sends `{ type: 'elements', elements }` over the WS when WS is open.
  - `onWhiteboardChange`: sends `{ type: 'files', files }` only for file IDs not previously sent.
  - `onWhiteboardChange`: does not send if WS is not open.
  - `onPointerUpdate`: sends `{ type: 'cursor', x, y }` over the WS.
  - On unmount: `ws.close()` is called.

- `live-session.tsx` (additions to existing test file — do not change existing tests):
  - `useWhiteboardSync` mock returns stable no-ops. Existing tests pass unchanged.

- `live-appointment.tsx` (additions to existing test file — do not change existing tests):
  - `useWhiteboardSync` mock returns stable no-ops. Existing tests pass unchanged.

---

## Out of Scope

- Whiteboard snapshot saved on appointment end (EDG-47).
- Associative image library (EDG-62, EDG-63).
- Conflict resolution for simultaneous edits from both parties (Excalidraw's own CRDT handles this when elements are merged).
- WebSocket authentication via anything other than cookies (no token-based WS auth needed).
- Reconnection / exponential backoff logic (out of scope for thesis).
- Production-grade WebSocket scaling (e.g. Redis pub/sub for multi-server deployments) — single Bun server is assumed.
- Vite dev proxy configuration for WS (`ws: true`) — not needed because `VITE_API_URL` is used for direct connection to the backend.
