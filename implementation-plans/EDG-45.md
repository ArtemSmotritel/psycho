# Implementation Plan: EDG-45 — Client can participate in an active appointment

## Issues & Questions

1. **"Session ended" modal without WebSockets.** No WebSocket/SSE infrastructure exists (that's EDG-46). Use polling: `setInterval` every 5 seconds calls `getClientAppointmentById`. When status transitions to `past`, show the modal with auto-dismiss (navigate to detail page after 5 seconds).

2. **`appointment-detail.tsx` active branch change breaks existing tests.** Three test cases in `client-appointment-detail.test.tsx` assert inline active-state content. Replacing that branch with `<Navigate>` requires updating those tests to assert redirect behavior. EDG-45 is the explicit requirement triggering this change, so the test updates are in scope.

3. **Whiteboard stub included.** The same read-only Excalidraw stub as `live-session.tsx` is rendered. Real-time sync is EDG-46.

4. **Client live route URL.** `client/appointments/:appointmentId/live` (no `clientId` — consistent with the rest of the client-side URL structure).

---

## Overview

EDG-45 builds the client-facing live appointment page at `client/appointments/:appointmentId/live`. No backend changes needed — `GET /api/appointments/:appointmentId` already exists and returns the current status. The new page mirrors `live-session.tsx`: time range header, Google Meet alert, "Join Call" action, Excalidraw stub. It polls for status changes every 5 seconds; when status becomes `past`, shows a "Session Ended" modal with a 5-second auto-dismiss to the appointment detail page. The `appointment-detail.tsx` active branch is replaced with a `<Navigate>` redirect to the new live route.

---

## Implementation Steps

### 1. No backend changes

The `GET /api/appointments/:appointmentId` client route already exists and returns `AppointmentWithPsycho` with `status`. No new routes, services, or migrations needed.

### 2. Frontend — create `live-appointment.tsx`

File: `frontend/app/routes/client/live-appointment.tsx` (new)

**State:** `appointment: AppointmentWithPsycho | null`, `isLoading: boolean`, `showEndedModal: boolean`.

**Initial fetch effect** (on `appointmentId` mount):
- Calls `appointmentService.getClientAppointmentById(appointmentId!)`.
- Sets `appointment` on success, `null` on error.
- Sets `isLoading = false` in finally.

**Polling effect** (runs while `appointment?.status === 'active'`):
- `setInterval` every 5000ms calls `getClientAppointmentById`.
- If result status is `'past'`: clear interval, update appointment, `setShowEndedModal(true)`.
- Cleanup: `clearInterval` on unmount / status change.

**Auto-dismiss effect** (runs when `showEndedModal === true`):
- `setTimeout(() => navigate(\`/client/appointments/${appointmentId}\`), 5000)`.
- Cleanup: `clearTimeout`.

**Render:**
- Loading → `<p>Loading appointment...</p>`.
- Null or not active (and modal not showing) → fallback with "No active appointment found." + back link.
- Active (or modal showing, to render page behind modal):
  - Date/time header (mirror `live-session.tsx` pattern with `format` from `date-fns`).
  - Google Meet `Alert` (link or "No Google Meet link" text).
  - `ActionsSection`: "Join Call" `ActionItem href={googleMeetLink}` — only when link present.
  - Lazy Excalidraw `<Suspense>` stub (same pattern as `live-session.tsx`).
- "Session Ended" `Dialog` (`open={showEndedModal}`, `onOpenChange` no-op):
  - `DialogTitle`: "Session Ended"
  - `DialogDescription`: "Your psychologist has ended the session."
  - `DialogFooter`: "Go to summary" `Button` → `navigate(\`/client/appointments/${appointmentId}\`)`.

### 3. Frontend — update `appointment-detail.tsx` active branch

File: `frontend/app/routes/client/appointment-detail.tsx`

- Add `Navigate` to the `react-router` import.
- Add `const { appointmentId } = useParams<{ appointmentId: string }>()` to the component.
- Replace the inline `active` branch with:
  ```tsx
  if (appointment.status === 'active') {
      return <Navigate to={`/client/appointments/${appointmentId}/live`} replace />
  }
  ```

### 4. Frontend — update `client-appointment-detail.test.tsx`

File: `frontend/app/test/client-appointment-detail.test.tsx`

Update the three `active`-state test cases to assert redirect behavior:
- Add a catch-all `<Route path="*" element={<div data-testid="redirected" />} />` to the test renderer.
- Assert `screen.getByTestId('redirected')` is visible when appointment status is `active`.
- Remove assertions for old inline active content ("appointment is currently active", "Join Call" button visibility from detail page).

### 5. Frontend — register route in `routes.ts`

File: `frontend/app/routes.ts`

Add inside the client layout block:
```typescript
route('client/appointments/:appointmentId/live', 'routes/client/live-appointment.tsx'),
```

### 6. Frontend — tests for `live-appointment.tsx`

File: `frontend/app/test/live-appointment.test.tsx` (new)

Mock: `appointmentService` (`getClientAppointmentById`), `useRoleGuard`, `useNavigate`, `ActionsSection`, `@excalidraw/excalidraw` as `<div data-testid="excalidraw" />`, `~/components/ui/dialog` as simple div wrappers. Use `vi.useFakeTimers()` for polling/auto-dismiss tests.

See Tests section for full case list.

---

## Files to Create

| Path | Description |
|------|-------------|
| `frontend/app/routes/client/live-appointment.tsx` | Client live appointment page with polling and "Session Ended" modal |
| `frontend/app/test/live-appointment.test.tsx` | Vitest tests for `live-appointment.tsx` |

## Files to Modify

| Path | Change |
|------|--------|
| `frontend/app/routes.ts` | Add `client/appointments/:appointmentId/live` route |
| `frontend/app/routes/client/appointment-detail.tsx` | Replace `active` branch with `<Navigate>` redirect; add `useParams` |
| `frontend/app/test/client-appointment-detail.test.tsx` | Update three `active`-state tests to assert redirect instead of inline content |

---

## Tests

### Backend

No new tests needed.

### Frontend (`live-appointment.test.tsx`)

- Shows loading state while initial fetch pending.
- Renders formatted date and time range for active appointment.
- Renders "Join Call" link when `googleMeetLink` present.
- Does not render "Join Call" when `googleMeetLink` null.
- Renders Excalidraw stub (`data-testid="excalidraw"`).
- Shows fallback when appointment is null.
- Shows fallback when appointment status is `upcoming`.
- After poll tick returns `past`, "Session Ended" modal title is visible.
- "Go to summary" button in modal calls `navigate` immediately.
- Auto-dismiss: 5 seconds after modal shown, `navigate` is called automatically.

### Updated `client-appointment-detail.test.tsx`

- When appointment is `active`, component redirects (catch-all route renders, not old inline content).

---

## Out of Scope

- Real-time whiteboard sync (EDG-46).
- Whiteboard snapshot on end (EDG-47).
- Client past appointment detail view (EDG-24).
- Email notification to client on appointment start (EDG-66).
- Any backend changes.
- Psychologist live page (EDG-44, already done).
