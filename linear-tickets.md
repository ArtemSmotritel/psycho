# Linear Tickets — Edge-of-Heaven

All tickets in the workspace, organized by project. Tickets with no project are listed separately.

**Paper priority** column legend:
- `required` — must be implemented and demonstrable at the thesis defense to satisfy stated paper requirements
- `good to have` — valuable for the product but not required by the paper; implement after all required tickets are done

---

## Design decisions log

Decisions made during project review. Use these as the source of truth when writing ACs.

| # | Issue | Decision |
|---|-------|----------|
| 1 | Client self-registration | Both roles can self-register with Google. A user only gains access to a psychologist's workspace after accepting an invitation. Paper is reference-only and will not be modified. |
| 2 | Roleless client UX | Keep "client" in role selection. After picking it with no invitation, show empty state: "Your psychologist will send you an invitation. Check your email." |
| 3 | Naming collision: auth session vs. product session | Product concept is renamed **appointment** everywhere (DB, routes, services, UI) to avoid collision with better-auth `session`. Current tickets that say "meeting" will be renamed to "appointment" when ACs are written. |
| 4 | Client cancellation | Clients can only **request** — both reschedule and cancellation go to the psychologist for approval. Clients have no direct control over appointments. |
| 5 | Appointment lifecycle | Three states: **upcoming** (future), **active** (psychologist has manually started it), **past** (psychologist has manually ended it). Whiteboard accessible only during **active**. Notes (psychologist) and impressions (client) can be created during **active** or any **past** appointment (see Decisions 27, coverage gaps). Only one appointment can be active at a time per psychologist. |
| 6 | Multi-psychologist data scoping | Data (appointments, notes, recommendations) is scoped per psychologist-client pair. Exception: the client dashboard shows all data across all psychologists together. |
| 7 | Google Meet / dual-surface UX | Appointment page shows a prominent "Join call" button (opens Meet in a new tab) + the whiteboard. Onboarding/empty states frame the app as a companion tool to the call. |
| 8 | EDG-5 (stale Elysia.js ticket) | Cancel. Superseded by EDG-17. |
| 9 | EDG-27 / EDG-29 (client-initiated appointment requests) | Keep. Will be added to the paper's requirements at a later stage. |
| 10 | Recommendation reactions | Client can mark a recommendation as done/not done and leave a comment. The done/not-done status is **freely toggleable at any time**, even after the psychologist has replied. Psychologist can see the comment and reply once (one level deep). No notifications for now. |
| 11 | Ticket structure duplication (EDG-9/10 vs EDG-31, EDG-11 vs EDG-34) | Keep structure as-is. Overlap will be disambiguated when ACs are written. |
| 12 | Appointment change/delete notifications | Email scope extended: client receives email when an appointment is deleted, rescheduled, or when the psychologist acts on a reschedule/cancellation request. |
| 13 | Google Calendar OAuth scope | Calendar scope (`calendar.events`) is requested during the initial Google Sign-In **for psychologist accounts only**. All psychologists must grant it at sign-up, regardless of whether they use Meet auto-generation. |
| 14 | Multi-role user role switching | One role is "active" at a time, stored in session. Dual-role users see a role selection screen after login. Role switcher is accessible inside the sidebar (not in main nav). The role switcher is **disabled while the psychologist has an active appointment** — a tooltip reads "End your active appointment before switching roles." Needs to be added to EDG-7 scope. |
| 15 | Invitation email vs. Google account email | The Google account email **must match** the invited email. If they differ after sign-in, show an error: "Please sign in with the email this invitation was sent to." |
| 16 | Client/psychologist disconnect | Only the **psychologist** can remove a client from their list. Historical data (appointments, impressions, and recommendations) is preserved and readable by both parties after disconnection. **Psychologist notes are explicitly excluded** — they remain private to the psychologist only, before and after disconnection. No new appointments can be created. Clients cannot disconnect unilaterally. |
| 17 | Reschedule request response | Psychologist can only **approve or reject** the client's proposed time — no counter-proposal. Client receives an email notification of the decision either way. |
| 18 | Resend invitation (EDG-32) | Resend **always regenerates** the invitation token. The old token is invalidated. A fresh email is sent with the new token. |
| 19 | Client invitation arrival notification | When a psychologist sends an invitation to an **existing registered user**, the system sends that user an email notifying them of the new invitation. Add to the email reminders scope. |
| 20 | Client cancellation request | Separate tickets: new client-side ticket "Client can request appointment cancellation" + new psychologist-side ticket "Psycho can review cancellation requests". EDG-28 scope stays as reschedule-only. |
| 21 | Active appointment view | Two new tickets: "Psycho can conduct an active appointment" (whiteboard, start/end controls) and "Client can participate in an active appointment" (whiteboard, Join call button). |
| 22 | Active state stuck | No auto-cleanup. If a psychologist tries to start a new appointment while one is still active, show a warning and an inline "End previous appointment" button. They must end the active one first. |
| 23 | Deletion of past appointments | Only **upcoming** appointments can be deleted. Past appointments cannot be deleted, preserving all associated notes, impressions, and recommendations. |
| 24 | Client impression visibility | Impressions are visible to **both** the client and the psychologist. They appear on the past appointment detail view for the psychologist (EDG-21). |
| 25 | Appointment start window | No time-based constraint on when a psychologist can start an appointment. Warning shown if another appointment is already active (per Decision 22). |
| 26 | Client appointment list scope | Two views: (1) a global list of all appointments across all psychologists (default), (2) per-psychologist appointment list accessible via the psychologist relationship context (EDG-16). |
| 27 | Impression submission rules | Multiple impressions can be submitted per appointment, each timestamped. No editing after submission. Progress timeline shows all entries chronologically. Impressions can be submitted **during an active appointment or at any point after** (past state). |
| 28 | Active appointment client notification | When a psychologist starts an appointment, the client receives an email notification ("Your session with [Psychologist] has started. Join now."). Add this as trigger 7 to the email reminders scope. (Flaw 3 resolution) |
| 29 | Whiteboard persistence | Whiteboard content is saved as a static image snapshot when the psychologist ends the appointment. The snapshot is stored and displayed in the past appointment detail view for both parties: psychologist (EDG-21) and client (EDG-24). (Flaw 5 resolution) |
| 30 | Appointment duration | Appointments store both **start and end datetime**. End time is required when creating an appointment (EDG-17). Used for: Google Calendar event creation, appointment reminder scheduling, and appointment list display ("Mon 3:00–4:00 pm"). |
| 31 | Appointment reminder timing | Two reminder emails per appointment: (1) **24 hours** before start time, (2) **1 hour** before start time. Update email reminders trigger #1 in coverage gaps accordingly. |
| 32 | Invitation cancellation | Psychologist can **cancel any pending invitation**. The token is immediately invalidated and no new email is sent. A "Cancel" action appears on pending invitations in the EDG-30 list view. Add as a new sub-ticket under EDG-13. |
| 33 | Concurrent appointment requests | A client can only have **one active pending request** (reschedule or cancellation) per appointment at a time. Submitting a new request automatically invalidates the existing pending one. Add this constraint to the reschedule and cancellation ticket scopes (EDG-26, and the new cancellation request ticket). |
| 34 | Invitation expiry period | Pending invitations expire **7 days** after being sent or re-sent. After expiry the status changes to "expired" and the psychologist can resend (EDG-32). |
| 35 | Psychologist disconnection mid-appointment | If a psychologist disconnects mid-appointment (browser closes, network drop, etc.), the appointment remains **active and does not auto-end**. It must be ended manually when the psychologist reconnects. This is consistent with Decision 22 (no auto-cleanup). Add to the active appointment ticket scope. |
| 36 | Session-end UX for client | When the psychologist ends an appointment, the client sees a **"Session ended" modal** ("Your psychologist has ended the session."). After dismissal or a short delay, the client is redirected to the past appointment detail view (EDG-24). Add to "Client can participate in an active appointment" ticket scope. |

---

## Project: User Management

Status: Planned

| ID | Title | Linear | Paper priority | Status |
|----|-------|--------|----------------|--------|
| EDG-6 | User sign-up flow | Medium | required | Todo |
| EDG-7 | User own role management | Medium | required* | Todo |
| EDG-8 | User own profile management | Low | good to have | Backlog |

*EDG-7 is **required** for the basic role-selection flow (psychologist → dashboard, client → access after being added). The following parts of EDG-7 are **good to have**: dual-role support (role switcher in sidebar, session storage of active role, disabled switcher during active appointment); client roleless empty-state UX ("Your psychologist will send you an invitation…").

### EDG-6 — User sign-up flow
Partial ACs exist: home page has a "start" button → redirects to login page → login page has a single "Sign in with Google" button.

**Design notes:**
- For users who sign up as **Psychologist**: Google OAuth must request `calendar.events` scope in addition to basic profile/email. This is required to support optional Google Meet link auto-generation during appointment creation. (Decision 13)

### EDG-7 — User own role management
No ACs yet.

**Design notes:**
- After Google sign-in, a new user is `roleless` and must pick a role.
- Available choices: **Psychologist** or **Client**.
- If they pick **Client** with no pending invitation, show empty state: "Your psychologist will send you an invitation. Check your email." They cannot access any features until connected to a psychologist.
- If they pick **Psychologist**, proceed to the psychologist dashboard.
- A user can hold both roles simultaneously (e.g. a psychologist who is also someone else's client). After login, dual-role users see a role selection screen. One role is **active** at a time (stored in session). Role switching is available via a switcher in the **sidebar**. (Decision 14)

### EDG-8 — User own profile management
No ACs yet. Low priority.

---

## Project: Client Invitations

Status: Backlog

**Key design decisions:**
- Invitations are delivered **by email only**.
- A client **can be connected to multiple psychologists** simultaneously.
- Two invitation paths:
  1. Psychologist invites an **existing registered user** (EDG-9) — user receives email notifying them of the invitation, accepts or declines inside the app (EDG-33–35). (Decision 19)
  2. Psychologist invites an **unregistered person by email** (EDG-10, EDG-12) — recipient clicks the email link, signs up with Google, and is automatically linked to that psychologist.
- Invitation statuses: **pending**, **accepted**, **declined**, **expired**.
- When the invited email ≠ the Google account email used at sign-up, an error is shown: "Please sign in with the email this invitation was sent to." (Decision 15)
- Resend (EDG-32) always regenerates a new token; old token is immediately invalidated. (Decision 18)
- Only the psychologist can remove a client from their list. Historical data is preserved after disconnection. Clients cannot disconnect unilaterally. (Decision 16)

### Simple client access — required path

These two tickets cover the minimum needed for the paper: a psychologist adds a client, the client gains access. The full invitation flow below is additive on top of this.

| ID | Title | Linear | Paper priority | Status |
|----|-------|--------|----------------|--------|
| NEW | Psycho can add a client by entering their email | High | required | To create |
| NEW | Added client receives access and is linked to the psychologist | High | required | To create |

### Top-level issues

| ID | Title | Linear | Paper priority | Status |
|----|-------|--------|----------------|--------|
| EDG-9 | Psycho can invite existing users to become their clients | Medium | good to have | Todo |
| EDG-10 | Psycho can invite people by email to join as their clients | Medium | good to have | Todo |
| EDG-11 | Registered clients can accept psycho invitations | Medium | good to have | Todo |
| EDG-12 | Users can join portal via email invitation and immediately become clients of the psycho who invited them | Medium | good to have | Todo |
| EDG-15 | Psycho clients management | Medium | required | Todo |
| EDG-16 | Client psychos management | Medium | good to have | Todo |

**EDG-15** — Psychologist's view of their client list (all accepted clients).
**EDG-16** — Client's view of all psychologists they are connected to.

### Sub-group: EDG-13 — Psycho invitations management (parent)

| ID | Title | Linear | Paper priority | Status |
|----|-------|--------|----------------|--------|
| EDG-13 | Psycho invitations management | Medium | good to have | Todo |
| EDG-30 | Psycho sees sent invitations with their statuses | Medium | good to have | Todo |
| EDG-31 | Psycho can create an invitation | Medium | good to have | Todo |
| EDG-32 | Psycho can resend an invitation | Medium | good to have | Todo |
| NEW | Psycho can cancel a pending invitation | Medium | good to have | To create |

**EDG-32** — Resend is only valid for **pending** or **expired** invitations.
**NEW (cancel)** — Cancel is only valid for **pending** invitations. Token is invalidated; no email is sent. (Decision 32)

### Sub-group: EDG-14 — Client invitation management (parent)

| ID | Title | Linear | Paper priority | Status |
|----|-------|--------|----------------|--------|
| EDG-14 | Client invitation management | Medium | good to have | Todo |
| EDG-33 | Client can see received invitations | Medium | good to have | Todo |
| EDG-34 | Client can accept an invitation | Medium | good to have | Todo |
| EDG-35 | Client can decline an invitation | Medium | good to have | Todo |

All issues in this project have **no description or ACs yet**.

---

## Project: Session Scheduling

> **Naming:** All "meeting" references in ticket titles will become **"appointment"** when ACs are written. This avoids collision with the better-auth `session` concept in the codebase.

Status: Backlog

**Key design decisions:**
- Only psychologists create, edit, and **delete upcoming** appointments. Past appointments cannot be deleted. (Decisions 23)
- Google Meet link is **optionally auto-generated via Google Calendar API** — the psychologist opts in during appointment creation. Manual link entry or no link are also valid. The `calendar.events` OAuth scope is requested from psychologists at sign-up. (Decision 13)
- Clients can **request** a reschedule or cancellation. These are always requests — the psychologist must review and act on them. Psychologist can only approve or reject; no counter-proposal. Client receives email on decision. (Decisions 17, 20)
- Appointment states: **upcoming** → **active** → **past**. Psychologist manually starts and ends an appointment. Only one appointment can be active at a time per psychologist. No auto-cleanup — if another is active when starting, a warning + inline "End previous" button is shown. (Decisions 5, 22)
- No time constraint on when an appointment can be started. (Decision 25)
- Whiteboard is accessible only during **active** state. Notes and impressions are available for any **past** appointment.
- Client receives email when an appointment is deleted (EDG-19) or rescheduled (EDG-18). (Decision 12)

### Psychologist-side

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| EDG-17 | Psycho can schedule appointments | Medium | required | Todo | Create appointment; optional Google Meet link generation |
| EDG-18 | Psycho can change an appointment | Medium | required | Todo | Edit date/time/link; client receives email on change |
| EDG-19 | Psycho can delete an appointment | Medium | required | Todo | Upcoming appointments only; client receives email on deletion |
| EDG-20 | Psycho can see appointments | Medium | required | Todo | List of all appointments (past + upcoming + active) for a given client |
| EDG-21 | Psycho can review a past appointment | Medium | required | Todo | Detail view; shows notes, client impressions (visible to psycho), recommendations, whiteboard snapshot |
| EDG-22 | Psycho can review an upcoming appointment | Medium | required | Todo | Detail view; shows Meet link if present; Start button (no time constraint) |
| EDG-28 | Psycho can review reschedule requests | Low | good to have | Todo | Approve or reject; client emailed on decision |
| EDG-29 | Psycho can review new appointment requests | Low | good to have | Todo | See and act on client requests for new appointments |
| NEW | Psycho can conduct an active appointment | High | required | To create | Active state: whiteboard, Join call button, End appointment button; warning + inline "End previous" if another is active (Decision 22); appointment remains active on disconnect (Decision 35) |
| NEW | Psycho can review cancellation requests | Low | good to have | To create | Approve or reject client cancellation requests; client emailed on decision |

### Client-side

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| EDG-23 | Client can see appointments | Medium | required | Todo | Global list across all psychologists (default) + per-psychologist list via EDG-16 context |
| EDG-24 | Client can review a past appointment | Medium | required | Todo | Detail view; shows impressions they submitted, psychologist recommendations, whiteboard snapshot |
| EDG-25 | Client can review an upcoming appointment | Medium | required | Todo | Detail view; shows "Join call" button if Meet link present |
| EDG-26 | Client can request an appointment reschedule | Low | good to have | Todo | Submit a reschedule request; psychologist must approve |
| EDG-27 | Client can request a new appointment | Low | good to have | Todo | Submit a request for a new appointment; psychologist must approve |
| NEW | Client can participate in an active appointment | High | required | To create | Active state: whiteboard, Join call button; accessible when psychologist has started; "Session ended" modal on psychologist end (Decision 36) |
| NEW | Client can request appointment cancellation | Low | good to have | To create | Submit a cancellation request; psychologist must approve; client emailed on decision |

---

## Project: Core Session Features

> These are the differentiating features of the system — the reason it is a psychologist tool and not a generic scheduling app. All were previously in "coverage gaps" with no tickets. They are the highest-priority work after basic auth and appointment CRUD.

### Whiteboard

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| NEW | Interactive whiteboard — real-time drawing and cursor sharing | High | required | To create | WebSockets; both psychologist and client can draw; cursor sharing for both; accessible during active appointment only (Decision 5) |
| NEW | Whiteboard saved as snapshot on appointment end | High | required | To create | Static image saved when psychologist ends appointment; displayed in past appointment detail for both parties (Decision 29) |
| NEW | Psychologist can insert associative images onto whiteboard | Medium | good to have | To create | Images from the associative library placed onto the board during active appointment |
| NEW | Associative images library management | Low | good to have | To create | Psychologist uploads and manages image library between appointments |

### Notes, Impressions, Recommendations

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| NEW | Psychologist notes per appointment (text, image, audio) | High | required | To create | Private; visible to psychologist only; creatable/editable during active or any past appointment (Decision 16) |
| NEW | Client impressions per appointment (text, image, audio) | High | required | To create | Multiple submissions allowed; each timestamped; no editing after submission; visible to both parties (Decisions 24, 27) |
| NEW | Psychologist recommendations per appointment (text, image, audio) | High | required | To create | Scoped to an appointment; visible to client; client can react (Decision 10) |
| NEW | Client can react to recommendations (done/not done + comment) | High | required | To create | Freely toggleable; client leaves one comment; psychologist can reply once (Decision 10) |

### Progress and dashboards

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| NEW | Client progress timeline | High | required | To create | Chronological view of all client impressions across all appointments within a psychologist-client pair; all timestamped entries shown |
| NEW | Client dashboard | High | required | To create | Aggregated view: upcoming appointments, pending recommendations, progress from all connected psychologists; global appointment list (Decision 26) |
| NEW | Psychologist dashboard | Medium | good to have | To create | Aggregated home view across all clients: upcoming appointments, active appointment indicator, pending reschedule and cancellation requests, quick access to recent clients |

### Email reminders

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| NEW | Email: appointment reminders (24h and 1h before start) | High | required | To create | Two emails per appointment; only for clients with email set (Decision 31) |
| NEW | Email: new recommendation notification to client | High | required | To create | Sent when psychologist creates a recommendation |
| NEW | Email: appointment deleted notification to client | Medium | good to have | To create | Sent when psychologist deletes an upcoming appointment (Decision 12) |
| NEW | Email: appointment rescheduled notification to client | Medium | good to have | To create | Sent when psychologist edits appointment date/time (Decision 12) |
| NEW | Email: psychologist acts on reschedule/cancellation request | Low | good to have | To create | Sent to client on approve or reject |
| NEW | Email: existing user notified of new invitation | Low | good to have | To create | Sent when psychologist invites an already-registered user (Decision 19) |
| NEW | Email: psychologist starts appointment (notify client) | Medium | good to have | To create | "Your session has started. Join now." (Decision 28) |

---

## No Project (Team-level)

| ID | Title | Linear | Paper priority | Status | Notes |
|----|-------|--------|----------------|--------|-------|
| EDG-1 | Get familiar with Linear (1) | — | good to have | Todo | Linear onboarding — not a product ticket |
| EDG-2 | Set up your teams (2) | — | good to have | Todo | Linear onboarding — not a product ticket |
| EDG-3 | Connect your tools (3) | — | good to have | Todo | Linear onboarding — not a product ticket |
| EDG-4 | Import your data (4) | — | good to have | Todo | Linear onboarding — not a product ticket |
| EDG-5 | Implement a backend endpoint "POST /sessions" | — | — | **To cancel** | Stale Elysia.js ticket, superseded by EDG-17. Must be cancelled in Linear. |

---

## Summary

| Project | Required tickets | Good to have tickets | Total |
|---------|-----------------|---------------------|-------|
| User Management | 2 (EDG-6, EDG-7 core) | 1 (EDG-8) + EDG-7 extras | 3 |
| Client Invitations — simple path | 2 (NEW×2) | — | 2 |
| Client Invitations — full flow | 1 (EDG-15) | 15 (all others) | 16 |
| Session Scheduling | 8 (EDG-17–22, NEW active ×2) | 5 (EDG-26–29, NEW cancel) | 13 |
| Core Session Features — whiteboard | 2 | 2 | 4 |
| Core Session Features — notes/impressions/recommendations | 4 | — | 4 |
| Core Session Features — progress/dashboards | 2 | 1 | 3 |
| Core Session Features — email | 2 | 5 | 7 |
| No project | — | 4 (EDG-1–4) | 5 (EDG-5 to cancel) |
| **Total** | **23** | **33** | **57** |

**Required tickets that existed before this review:** 12
**Required tickets added by this review (Core Session Features + simple client path):** 11

---

## Coverage gaps — resolved

All previously untracked features have been converted to tickets in the Core Session Features project above. The table below is kept for reference.

| Feature | Paper priority | Ticketed as |
|---------|----------------|-------------|
| Appointment page (live) | required | NEW "Psycho can conduct active appointment" + NEW "Client can participate in active appointment" |
| Interactive whiteboard (drawing, cursors) | required | NEW in Core Session Features — Whiteboard |
| Whiteboard snapshot on end | required | NEW in Core Session Features — Whiteboard |
| Associative images on whiteboard | good to have | NEW in Core Session Features — Whiteboard |
| Associative images library | good to have | NEW in Core Session Features — Whiteboard |
| Psychologist notes | required | NEW in Core Session Features — Notes/Impressions/Recommendations |
| Client impressions | required | NEW in Core Session Features — Notes/Impressions/Recommendations |
| Psychologist recommendations | required | NEW in Core Session Features — Notes/Impressions/Recommendations |
| Recommendation reactions | required | NEW in Core Session Features — Notes/Impressions/Recommendations |
| Client progress timeline | required | NEW in Core Session Features — Progress/Dashboards |
| Client dashboard | required | NEW in Core Session Features — Progress/Dashboards |
| Psychologist dashboard | good to have | NEW in Core Session Features — Progress/Dashboards |
| Email: appointment reminders | required | NEW in Core Session Features — Email |
| Email: new recommendation | required | NEW in Core Session Features — Email |
| Email: appointment deleted | good to have | NEW in Core Session Features — Email |
| Email: appointment rescheduled | good to have | NEW in Core Session Features — Email |
| Email: request decision | good to have | NEW in Core Session Features — Email |
| Email: invitation to existing user | good to have | NEW in Core Session Features — Email |
| Email: psychologist starts appointment | good to have | NEW in Core Session Features — Email |
