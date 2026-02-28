# Paper TODO — Terminology and Model Fixes

Action points for editing `paper.md`. Each item is a targeted change to align the paper
with the actual implementation decisions.

---

## 1. Replace session terminology throughout

**Problem**: `paper.md` uses "сесія" / "сеанс" (session) for the product concept of a
scheduled appointment between psychologist and client. The codebase uses "appointment"
everywhere (Decision 3 in linear-tickets.md) to avoid collision with the `better-auth`
`session` object.

**Action**: Replace all occurrences of "сесія" / "сеанс" used as the product concept
with a consistent Ukrainian term. Recommended term: **"прийом"** (lit. "appointment" /
"consultation"). Alternative: **"зустріч"** ("meeting"). Pick one and apply globally.

**Scope**: All sections of `paper.md` — ВСТУП, РОЗДІЛ 1, РОЗДІЛ 2, РОЗДІЛ 3, ВИСНОВКИ.
Do not replace "сесія" when it refers to auth/HTTP session context (e.g., "сесія
користувача" in an auth context).

---

## 2. Fix registration model description in section 1.5 (Постановка задачі)

**Problem**: The current section 1.5 (Постановка задачі) describes a model where the
psychologist registers clients. The actual app uses self-registration: both roles sign up
independently via Google OAuth. A client only gains access to a psychologist's workspace
after the psychologist adds them (by email) and the link is established.

**Action**: Update section 1.5 to describe the actual flow:
- Both psychologist and client self-register via Google OAuth.
- After registration, the client selects their role ("Клієнт").
- The psychologist adds the client to their workspace by entering the client's email.
- The client then gains access to the psychologist's appointments and content.

Remove any language implying the psychologist creates accounts for clients.

---

## 3. Add 3 missing NFRs in section 2.4

**Problem**: Three constraints from the design decisions log are not in the paper's NFR list
but qualify as formal non-functional requirements.

**Action**: When writing section 2.4 (NFR list), add:
- **Data isolation (security)**: Each psychologist-client pair's data is isolated. A
  psychologist cannot access another psychologist's clients' data. A client cannot access
  another client's records. (Decision 6)
- **Notes privacy (privacy)**: Psychologist notes are visible only to the psychologist who
  wrote them, including after the client-psychologist relationship ends. (Decision 16)
- **Single active appointment constraint (integrity)**: The system must enforce that no
  more than one appointment per psychologist can be in "active" state simultaneously.
  (Decision 5)

---

## 4. FR mapping — stay within 25-FR ceiling

**Problem**: 27 required tickets map to ~25+ distinct FRs, exceeding the 12–25 limit.

**Action**: When writing the FR table in section 2.4, apply these merges:
- EDG-18 + "Email: appointment rescheduled" → one FR: "Psychologist can reschedule
  appointments; client is notified by email"
- EDG-19 + "Email: appointment deleted" → one FR: "Psychologist can delete upcoming
  appointments; client is notified by email"
- NEW "Psycho can add client" + NEW "Added client receives access" → one FR:
  "Psychologist can add registered clients to their workspace"

Target: **~23 FRs** in the table.

---

## 5. Justify Google Calendar OAuth scope in section 3.1

**Problem**: Decision 13 requires all psychologists to grant `calendar.events` scope at
sign-up, even though Google Meet link generation is optional (EDG-17).

**Action**: In section 3.1, under auth/Google OAuth, add: "The `calendar.events` scope is
requested upfront for all psychologist accounts to avoid an additional OAuth redirect
mid-session when the psychologist first tries to generate a Meet link."

---

## 6. Architectural pattern — open question for supervisor

**Problem**: Section 2.5 must open with the choice and justification of an architectural
pattern before presenting the package diagram.

**Action**: Confirm with supervisor. Candidate: **client-server with layered architecture**
(backend: routes → services → DB; frontend: pages → components → API client). Alternative:
**SOA**, emphasizing the domain-per-feature structure of `src/features/`. Use "client-server
with layered architecture" as placeholder until confirmed.

---

## 7. Section 2.3 — justify whiteboard as compound requirement (INVEST "Small")

**Problem**: Section 2.3 requires INVEST analysis. The whiteboard FR bundles drawing +
cursor sharing + image upload, violating INVEST's "Small" criterion.

**Action**: In section 2.3, note: "The whiteboard requirement is kept as a single compound
requirement because all three capabilities share the same WebSocket event stream and cannot
be delivered or tested independently."
