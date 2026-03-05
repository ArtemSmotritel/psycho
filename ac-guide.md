# AC Writing Guide — Edge-of-Heaven

A step-by-step instruction set for an LLM to process each Linear ticket and write complete, implementable Acceptance Criteria (ACs). The output of this process is a ticket that another LLM (or developer) can implement.

---

## 0. Before You Start

Read these files **in full** before touching any ticket. Do not skip.

| File | What it gives you |
|------|-------------------|
| `linear-tickets.md` | Source of truth: all tickets, design decisions log, paper priority, scope notes |
| `CLAUDE.md` | Stack, architecture, module conventions, code style |

Internalize the **Design Decisions Log** (section 1 of `linear-tickets.md`). Every decision there is final and must be reflected in ACs — do not contradict or re-litigate them.

---

## 1. Per-Ticket Process

For each ticket, follow this sequence exactly.

### Step 1 — Gather context

Collect everything that affects this ticket:

1. **The ticket's own notes** from `linear-tickets.md` (scope notes column, any design notes under the ticket ID).
2. **All design decisions** that mention this ticket by ID or by feature.
3. **Related tickets**: parent issues, child sub-issues, tickets this one depends on or that depend on it.
4. **Paper priority**: `required` tickets must have exhaustive ACs. `good to have` tickets need solid ACs but can defer edge cases to implementation.

### Step 2 — Write the ticket in Linear

Fill the following fields (detailed format in Section 2):

- **Description** — user story + context
- **Acceptance Criteria** — the core deliverable
- **Implementation Notes** — backend and frontend hints (DB schema, API shape, component hints)
- **Out of Scope** — explicit list of what this ticket does NOT cover
- **Related Tickets** — cross-references

### Step 3 — Self-check

Before moving to the next ticket, verify against the checklist in Section 4.

---

## 2. Field Formats

### 2.1 Description

One short paragraph. Answer: *who does what, and why does it matter to the product?*

Use this pattern:
```
As a [psychologist | client | rolesless user], I want to [action] so that [outcome].

[1–3 sentences of context: what state the system is in before this feature, what problem it solves, any relevant design decision numbers.]
```

For system-initiated actions with no human actor (background jobs, email sends, migrations), replace the user story with a plain declarative sentence:
```
The system [action] when [trigger].

[1–3 sentences of context.]
```

### 2.2 Acceptance Criteria

The core of the ticket. Every AC is a verifiable, binary statement — it either passes or fails. No vague language ("should work", "handles correctly", "looks good").

**Structure:**

```markdown
## Acceptance Criteria

### Happy Path
- [ ] AC statement (concrete, specific, testable)
- [ ] AC statement
- ...

### Validation & Error States
- [ ] AC statement for each invalid input / forbidden action
- [ ] ...

### Edge Cases
- [ ] AC statement for each boundary condition
- [ ] ...

If no edge cases apply, write `_(none)_` or omit the section.

### Backend
- [ ] Endpoint exists: METHOD /path
- [ ] Request shape: { field: type, ... }
- [ ] Response (success): { field: type, ... }
- [ ] Response (error): `{ code: string, message: string }`
- [ ] DB changes: table/column created or modified (omit if this ticket makes no schema changes)
- [ ] Auth guard: which role(s) can call this endpoint
- [ ] ...

### Frontend
- [ ] Route/page exists at: /path
- [ ] UI states covered: [empty | loading | error | success | etc.]
- [ ] User interactions: what happens on each action
- [ ] Navigation: where the user goes before and after
- [ ] ...
```

**Rules for writing individual ACs:**

- Start with the observable result, not the mechanism. ✅ "The client sees an 'Appointment ended' modal" — not ❌ "The system emits a WebSocket event".
- One fact per bullet. Never combine two conditions with "and" unless they are literally inseparable.
- Be explicit about who the actor is if the ticket touches multiple roles.
- Specify exact UI copy for error messages, empty states, and confirmations — copy from the design decisions log where available.
- For emails: specify the trigger condition, recipient, and required content (subject line, key body elements).

### 2.3 Implementation Notes

Not ACs — these are hints to the implementing LLM about the expected technical approach. They do not need to be tested directly.

```markdown
## Implementation Notes

**Backend**
- Suggested table/column names (follow existing schema conventions)
- Relevant existing services/routes to extend or reference
- Any non-obvious constraint (e.g., "use a DB transaction here", "must be idempotent")

**Frontend**
- Suggested component location
- Relevant existing components to reuse (e.g., shadcn/ui primitives)
- State management notes
```

Keep this section short. If implementation is obvious from the ACs, omit.

### 2.4 Out of Scope

Explicit list of things that are **not** part of this ticket. This prevents scope creep during implementation.

```markdown
## Out of Scope
- [feature] — covered by EDG-XX
- [feature] — good to have, not required for this ticket
- [feature] — deliberate product decision (Decision N)
```

Always include at least one entry. If nothing is obviously out of scope, think harder — there's almost always a related feature that could be confused as part of this ticket.

### 2.5 Related Tickets

```markdown
## Related
- EDG-XX — [short description of relationship: depends on / depended by / same feature area]
```

---

## 3. Project-Specific Conventions

### Stack reminders for ACs

| Layer | Conventions to reflect in ACs |
|-------|-------------------------------|
| Auth | Role is sent via `Helpsycho-User-Role` header (`psycho` / `client` / `rolesless`). `rolesless` means the user is authenticated but has not yet selected a role (handled by EDG-6/EDG-7). Auth is via better-auth Google OAuth. |
| Backend routes | Hono, feature-based: `src/features/<domain>/routes.ts`. Middleware: `onlyPsychoRequest` / `onlyClientRequest`. |
| DB | Raw SQL via Bun's native SQL client. No ORM. Migrations in `backend/src/migrations/`. |
| Frontend routes | React Router v7 framework mode. URL pattern: `/:role/...`. |
| API client | Axios with `baseURL: '/api'` and `withCredentials: true`. |
| UI components | shadcn/ui in `frontend/app/components/ui/`. TailwindCSS v4. |

### Naming conventions to enforce in ACs

- The product concept is **appointment** (never "session" or "meeting" — Decision 3).
- Appointment states: **upcoming**, **active**, **past** (Decision 5).
- Invitation statuses: **pending**, **accepted**, **declined**, **expired** (Decision 34 for expiry = 7 days).
- Roles: **psychologist** (long form in UI copy), **psycho** (in code/routes/headers), **client**, **rolesless** (authenticated but no role selected yet — handled by EDG-6/EDG-7).

### Common AC patterns by ticket type

**CRUD endpoint (e.g., create appointment):**
- Endpoint exists with correct method and path
- Auth guard enforces correct role
- Required fields validated; missing/invalid fields return 400 with descriptive message
- Success returns correct shape and HTTP status
- DB row is created/updated/deleted as expected
- Forbidden operations return 403, not 404

**List/read endpoint:**
- Returns empty array (not null/error) when no records exist
- Data is scoped correctly (per psychologist-client pair, or per role — check Decision 6)
- Pagination (only if explicitly required by the ticket)

**Email trigger:**
- Email is sent when the specified event fires
- Email is NOT sent in other situations
- Required content is present (specify subject + key body fields)
- If recipient has no email address, system does not crash

**Frontend page:**
- Loading state shown while data fetches
- Empty state shown with correct copy when no data exists
- Error state shown if API call fails
- Success state matches AC descriptions
- Navigation (back links, redirects after actions) matches the intended flow

**WebSocket / real-time (whiteboard):**
- Both parties (psychologist and client) receive updates
- Connection loss does not corrupt state
- Reconnection resumes correct state

---

## 4. Quality Checklist

Before marking a ticket as AC-complete, verify every item:

- [ ] Every AC is a binary pass/fail statement — no ambiguous language
- [ ] Every design decision that touches this ticket is reflected in the ACs
- [ ] The happy path is fully covered (end-to-end, not just the API call)
- [ ] All error states have explicit ACs (what the user sees, what the API returns)
- [ ] Auth guard is specified (who can and cannot call each endpoint)
- [ ] Data scoping is correct (per Decision 6: data scoped to psychologist-client pair)
- [ ] "Out of Scope" section explicitly names at least one adjacent feature not covered
- [ ] Related tickets are cross-referenced
- [ ] No AC contradicts the Design Decisions Log
- [ ] For `required` tickets: edge cases are exhaustive, not best-effort
- [ ] Email tickets include: trigger, recipient, subject, and required body content
- [ ] UI tickets include: all UI states (loading, empty, error, success) and navigation

---

## 5. Ticket Processing Order

Work in this order to ensure downstream tickets can reference upstream ACs:

1. **EDG-6, EDG-7** — auth and role selection (everything else depends on this)
2. **EDG-41, EDG-42** — simple client linking (unlocks all appointment tickets)
3. **EDG-43** — remove client
4. **EDG-17 → EDG-22** — appointment CRUD (psychologist-side)
5. **EDG-23 → EDG-25** — appointment views (client-side)
6. **EDG-44, EDG-45** — active appointment (psychologist + client)
7. **EDG-46, EDG-47** — whiteboard (depends on active appointment)
8. **EDG-48 → EDG-51** — notes, impressions, recommendations
9. **EDG-52 → EDG-54** — dashboards and progress timeline
10. **EDG-55 → EDG-58** — required email triggers
11. **EDG-8, EDG-15, EDG-16** — profile and client management UI
12. **Good-to-have tickets** — invitations full flow (EDG-9 to EDG-35), reschedule/cancellation requests, remaining emails

---

## 6. Writing Style for ACs

- Use present tense: "The system returns..." not "The system should return..."
- Use active voice with a clear subject: "The psychologist sees..." / "The API returns..." / "The DB stores..."
- Avoid implementation details unless they are contractual: say "The appointment is saved" not "An INSERT is executed on the appointments table" — unless the exact DB behaviour is the AC (e.g., for a migration ticket).
- When referencing UI copy, use exact quoted strings.
- When referencing HTTP status codes, use the code number: `400`, `401`, `403`, `404`.

---

## 7. Example — EDG-19 (Psycho can delete an appointment)

This example shows what a complete ticket looks like after processing.

---

**Description**

As a psychologist, I want to delete an upcoming appointment so that cancelled appointments are removed from both my schedule and my client's view.

Only **upcoming** appointments can be deleted — **active** and past appointments cannot be deleted (Decision 23). The client receives an email notification when their appointment is deleted (Decision 12; see also EDG-57).

---

**Acceptance Criteria**

### Happy Path
- [ ] A psychologist can delete an appointment that is in **upcoming** state
- [ ] After deletion, the appointment no longer appears in the psychologist's appointment list (EDG-20) or the client's appointment list (EDG-23)
- [ ] After deletion, an email notification is sent to the client (trigger handled by EDG-57)

### Validation & Error States
- [ ] Attempting to delete a **past** appointment returns `400` with message: "Past appointments cannot be deleted"
- [ ] Attempting to delete an **active** appointment returns `400` with message: "Active appointments cannot be deleted"
- [ ] Attempting to delete an appointment that belongs to a different psychologist returns `403` with message: "Appointment not found or access denied"
- [ ] Attempting to delete a non-existent appointment returns `404`
- [ ] Unauthenticated requests return `401`
- [ ] Client role attempting this endpoint returns `403`

### Edge Cases
_(none)_

### Backend
- [ ] Endpoint exists: `DELETE /appointments/:appointmentId`
- [ ] Auth guard: `onlyPsychoRequest`
- [ ] Ownership check: the appointment's `psychologistId` must match the requesting psychologist
- [ ] State check: appointment state must be `upcoming`; reject `active` and `past`
- [ ] DB: the appointments row is deleted (hard delete)
- [ ] DB: all associated notes, impressions, and recommendations rows are deleted (cascade hard delete)
- [ ] Response (success): `204 No Content`
- [ ] Response (error): `{ code: string, message: string }`
- [ ] Email trigger: fires the deletion email event consumed by EDG-57 (event emission is this ticket's responsibility; the email implementation itself is EDG-57's)

### Frontend
- [ ] A "Delete" button (or action) is available on the upcoming appointment detail view (EDG-22)
- [ ] Clicking "Delete" shows a confirmation dialog: "Delete this appointment? Your client will be notified."
- [ ] Confirming deletion calls the API, then redirects the psychologist to the appointment list (EDG-20)
- [ ] If the API returns an error, an inline error message is shown; the user remains on the detail view
- [ ] The "Delete" button is not visible on past appointment detail views (EDG-21)
- [ ] The "Delete" button is not visible on active appointment detail views (EDG-44/EDG-45)

## Out of Scope
- Email sending — covered by EDG-57
- Deleting past appointments — explicitly forbidden (Decision 23)
- Deleting active appointments — explicitly forbidden (Decision 23)
- Client-initiated deletion — clients cannot delete appointments (Decision 4)

## Related
- EDG-22 — upcoming appointment detail view (hosts the Delete button)
- EDG-57 — email notification sent after deletion
- EDG-20 — psychologist appointment list (must no longer show the deleted appointment)
- EDG-23 — client appointment list (must no longer show the deleted appointment)
