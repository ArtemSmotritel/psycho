# Ticket Priority — Edge-of-Heaven

Priority is evaluated by the number of tickets blocked downstream (directly or transitively).
A ticket is higher priority when more work depends on it being done first.

**Scale:** Critical > High > Medium > Low > Standalone

---

## Critical
> Blocks the entire product. Nothing else can be meaningfully implemented without these.

- [ ] EDG-6 — User sign-up flow
- [ ] EDG-7 — User own role management

---

## High
> Foundational for a major module. 8–15 downstream tickets depend on these.

EDG-6/7 must be done before any of these.

- [ ] EDG-9 — Psycho can invite existing users to become their clients
- [ ] EDG-10 — Psycho can invite people by email to join as their clients
- [ ] EDG-11 — Registered clients can accept psycho invitations
- [ ] EDG-12 — Users can join portal via email invitation and immediately become clients
- [ ] EDG-17 — Psycho can schedule appointments
- [ ] EDG-31 — Psycho can create an invitation

> **Note:** EDG-9/10/31 overlap (Decision 11 — disambiguated when ACs are written).
> EDG-11/12 create the psychologist–client connection that EDG-17 depends on.

---

## Medium
> Blocks 3–7 tickets; required to unlock its own module.

- [ ] EDG-13 — Psycho invitations management *(parent ticket — container for EDG-30/31/32/cancel)*
- [ ] EDG-14 — Client invitation management *(parent ticket — container for EDG-33/34/35)*
- [ ] EDG-15 — Psycho clients management
- [ ] EDG-16 — Client psychos management
- [ ] EDG-22 — Psycho can review an upcoming appointment
- [ ] NEW — Psycho can conduct an active appointment

> **EDG-15/16** are navigation hubs — appointment flows are accessed through them.
> **EDG-22** hosts the "Start appointment" control that triggers the active state.
> **NEW conduct** blocks: client active participation, whiteboard snapshots in past appointment views.

---

## Low
> Blocks 1–2 tickets; secondary within its feature area.

- [ ] EDG-18 — Psycho can change an appointment
- [ ] EDG-19 — Psycho can delete an appointment
- [ ] EDG-20 — Psycho can see appointments
- [ ] EDG-21 — Psycho can review a past appointment
- [ ] EDG-23 — Client can see appointments
- [ ] EDG-24 — Client can review a past appointment
- [ ] EDG-25 — Client can review an upcoming appointment
- [ ] EDG-30 — Psycho sees sent invitations with their statuses
- [ ] EDG-32 — Psycho can resend an invitation
- [ ] EDG-33 — Client can see received invitations
- [ ] EDG-34 — Client can accept an invitation *(sub-ticket view of EDG-11)*
- [ ] EDG-35 — Client can decline an invitation
- [ ] NEW — Psycho can cancel a pending invitation
- [ ] NEW — Client can participate in an active appointment

> **EDG-25** blocks the reschedule and cancellation request tickets.
> **EDG-30** blocks EDG-32 and NEW cancel.
> **EDG-33** blocks EDG-34 and EDG-35.

---

## Standalone
> Does not meaningfully block other tickets. Isolated or good-to-have feature.

- [ ] EDG-8 — User own profile management
- [ ] EDG-26 — Client can request an appointment reschedule
- [ ] EDG-27 — Client can request a new appointment
- [ ] EDG-28 — Psycho can review reschedule requests
- [ ] EDG-29 — Psycho can review new appointment requests
- [ ] NEW — Client can request appointment cancellation
- [ ] NEW — Psycho can review cancellation requests

> EDG-26 → EDG-28, NEW cancel → NEW cancellation review are chains, but both ends are standalone.

---

## Non-product / Action Required
> Not implementation tickets.

- [ ] EDG-1 — Get familiar with Linear *(onboarding — skip)*
- [ ] EDG-2 — Set up your teams *(onboarding — skip)*
- [ ] EDG-3 — Connect your tools *(onboarding — skip)*
- [ ] EDG-4 — Import your data *(onboarding — skip)*
- [ ] EDG-5 — Implement a backend endpoint "POST /sessions" *(cancel in Linear — superseded by EDG-17)*
