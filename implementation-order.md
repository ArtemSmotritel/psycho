# Implementation Order

Tickets ordered by dependency chain and priority. Each phase depends on all previous phases being complete.

**Required tickets are listed first (Phases 1–9). Good-to-have tickets follow (Phases 10–13).**

---

## Phase 1 — Auth & User Roles (Foundation)

Everything else depends on users existing and having roles.

| # | ID | Title |
|---|-----|-------|
| 1 | EDG-6 | User sign-up flow |
| 2 | EDG-7 | User own role management |

---

## Phase 2 — Client Access: Required Simple Path

Psychologist must be able to add clients before any appointment work begins.

| # | ID | Title |
|---|-----|-------|
| 3 | EDG-41 | Psycho can add a registered client by entering their email |
| 4 | EDG-42 | Added client receives access and is linked to the psychologist immediately |
| 5 | EDG-15 | Psycho clients management |
| 6 | EDG-43 | Psycho can remove a client from their list |

---

## Phase 3 — Appointment Scheduling Core

Basic CRUD for appointments. Both sides need to see appointments before active sessions make sense.

| # | ID | Title |
|---|-----|-------|
| 7 | EDG-17 | Psycho can schedule appointments |
| 8 | EDG-18 | Psycho can change an appointment |
| 9 | EDG-19 | Psycho can delete an appointment |
| 10 | EDG-20 | Psycho can see appointments |
| 11 | EDG-22 | Psycho can review an upcoming appointment |
| 12 | EDG-23 | Client can see appointments |
| 13 | EDG-25 | Client can review an upcoming appointment |

---

## Phase 4 — Active Appointment

Requires appointments (Phase 3). Both sides must be implemented together — client view depends on the psychologist's start/end controls.

| # | ID | Title |
|---|-----|-------|
| 14 | EDG-44 | Psycho can conduct an active appointment |
| 15 | EDG-45 | Client can participate in an active appointment |

---

## Phase 5 — Whiteboard

Only accessible during active appointments. Snapshot (EDG-47) depends on the end-appointment action in EDG-44.

| # | ID | Title |
|---|-----|-------|
| 16 | EDG-46 | Interactive whiteboard — real-time drawing, cursor sharing, and image support |
| 17 | EDG-47 | Whiteboard saved as snapshot on appointment end |

---

## Phase 6 — Notes, Impressions, Recommendations

Created during or after active appointments. Recommendations must exist before reactions can be built.

| # | ID | Title |
|---|-----|-------|
| 18 | EDG-48 | Psychologist notes per appointment (text, image, audio) |
| 19 | EDG-49 | Client impressions per appointment (text, image, audio) |
| 20 | EDG-50 | Psychologist recommendations per appointment (text, image, audio) |
| 21 | EDG-51 | Client can react to recommendations (done/not done + comment) |

---

## Phase 7 — Past Appointment Reviews

Both views aggregate output from Phases 5 and 6. Implement after all data (snapshots, notes, impressions, recommendations) is in place.

| # | ID | Title |
|---|-----|-------|
| 22 | EDG-21 | Psycho can review a past appointment |
| 23 | EDG-24 | Client can review a past appointment |

---

## Phase 8 — Progress & Dashboards

Aggregate views. Require appointment data (Phase 3), impressions (Phase 6), and recommendation reactions (Phase 6).

| # | ID | Title |
|---|-----|-------|
| 24 | EDG-52 | Client progress timeline |
| 25 | EDG-53 | Client dashboard |
| 26 | EDG-54 | Psychologist dashboard |

---

## Phase 9 — Email Notifications (Required)

Can be built in parallel with Phases 7–8 once the triggering actions exist. Listed last because they extend existing features rather than enabling new ones.

| # | ID | Title | Depends on |
|---|-----|-------|------------|
| 27 | EDG-55 | Email: appointment reminders (24h and 1h before start) | EDG-17 |
| 28 | EDG-56 | Email: new recommendation notification to client | EDG-50 |
| 29 | EDG-57 | Email: appointment deleted notification to client | EDG-19 |
| 30 | EDG-58 | Email: appointment rescheduled notification to client | EDG-18 |

---

> **All required tickets complete after Phase 9.**

---

## Phase 10 — Full Invitation Flow (Good to Have)

Replaces/extends the simple client-access path from Phase 2. Build invitation creation first, then the list/management UI, then client-side acceptance.

| # | ID | Title |
|---|-----|-------|
| 31 | EDG-31 | Psycho can create an invitation |
| 32 | EDG-9 | Psycho can invite existing users to become their clients |
| 33 | EDG-10 | Psycho can invite people by email to join as their clients |
| 34 | EDG-30 | Psycho sees sent invitations with their statuses |
| 35 | EDG-32 | Psycho can resend an invitation |
| 36 | EDG-61 | Psycho can cancel a pending invitation |
| 37 | EDG-13 | Psycho invitations management (parent) |
| 38 | EDG-33 | Client can see received invitations |
| 39 | EDG-34 | Client can accept an invitation |
| 40 | EDG-35 | Client can decline an invitation |
| 41 | EDG-11 | Registered clients can accept psycho invitations |
| 42 | EDG-12 | Users can join portal via email invitation and immediately become clients |
| 43 | EDG-14 | Client invitation management (parent) |
| 44 | EDG-16 | Client psychos management |

---

## Phase 11 — Scheduling Extras (Good to Have)

Client-side requests depend on appointment views (Phase 3). Psychologist review tickets depend on the corresponding client request tickets.

| # | ID | Title | Depends on |
|---|-----|-------|------------|
| 45 | EDG-26 | Client can request an appointment reschedule | EDG-25 |
| 46 | EDG-27 | Client can request a new appointment | EDG-23 |
| 47 | EDG-28 | Psycho can review reschedule requests | EDG-26 |
| 48 | EDG-29 | Psycho can review new appointment requests | EDG-27 |
| 49 | EDG-59 | Client can request appointment cancellation | EDG-25 |
| 50 | EDG-60 | Psycho can review cancellation requests | EDG-59 |

---

## Phase 12 — Whiteboard Extras (Good to Have)

Library must exist before images can be inserted onto the board.

| # | ID | Title |
|---|-----|-------|
| 51 | EDG-63 | Associative images library management |
| 52 | EDG-62 | Psychologist can insert associative images onto whiteboard |

---

## Phase 13 — Remaining Emails & Profile (Good to Have)

| # | ID | Title | Depends on |
|---|-----|-------|------------|
| 53 | EDG-64 | Email: psychologist acts on reschedule/cancellation request | EDG-28, EDG-60 |
| 54 | EDG-65 | Email: existing user notified of new invitation | EDG-9 |
| 55 | EDG-66 | Email: psychologist starts appointment (notify client) | EDG-44 |
| 56 | EDG-8 | User own profile management | EDG-6 |

---

## Canceled (skip)

EDG-1, EDG-2, EDG-3, EDG-4 (Linear onboarding), EDG-5 (superseded by EDG-17).
