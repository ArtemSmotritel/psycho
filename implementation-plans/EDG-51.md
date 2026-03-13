# Implementation Plan: EDG-51 — Client can react to recommendations (done/not done + comment)

## Issues & Questions

**Questions**

1. **EDG-50 is a hard prerequisite and has no implementation plan yet.** EDG-51 adds reactions to recommendations, but the `recommendations` table and the recommendations backend feature (`backend/src/features/recommendations/`) do not exist in the codebase. The plan below assumes EDG-50 will be implemented first, or that EDG-51 is planned in sequence immediately after EDG-50. The schema steps in this plan must be applied on top of whatever table structure EDG-50 introduces. The specific columns assumed here are: `recommendations(id, appointment_id, psycho_id, client_id, content TEXT, created_at TIMESTAMPTZ)`. This assumption must be validated once EDG-50 is written.

2. **"Client leaves one comment" — does a second submission replace or fail?** Decision 10 says the client leaves "one comment," but does not say whether submitting again replaces the existing comment or returns an error. This plan assumes: updating the `done` toggle is always allowed (freely toggleable per Decision 10); the comment field is set once and then locked (a second `PATCH` with a non-null comment returns 400 `CommentAlreadySet`). This must be confirmed before implementation.

3. **Psychologist reply — where does it display on the client side?** The ticket says the psychologist can reply once (one level deep). It is unspecified whether the client sees the psychologist's reply inline on the same recommendation card, or in a separate notification. This plan assumes the reply is shown inline on the recommendation's detail view for both roles, as no notification mechanism (EDG-56 covers new recommendation notifications, not replies) is in scope here.

4. **Which views surface reactions and replies?** The ticket title says "client can react," but the reaction data must also be readable by the psychologist (they receive the comment and can reply). This plan covers: client sets reaction (`PATCH /api/appointments/:appointmentId/recommendations/:recommendationId/reaction`); psychologist reads reaction and posts reply (`PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId/reply`). The read surfaces (past appointment detail views for both roles) are handled in EDG-21 and EDG-24 respectively, but the API endpoints for fetching recommendations with their reactions are defined here so those views can consume them.

5. **`appointment_id` in the URL vs. scoped through `client_id`.** The psychologist's reply route must go through the psychologist-scoped path (`/api/clients/:clientId/appointments/:appointmentId/...`) to allow the ownership check. Verify: the psychologist owns the recommendation and can reply; the client can react (toggle + comment) on their own. This is the pattern followed by the existing appointment routes.

**Logical / business logic issues**

6. **`done` status is freely toggleable but comment is not.** Decision 10 says "the done/not-done status is freely toggleable at any time." The comment field must follow different rules (set once). The single `PATCH` endpoint must accept partial updates: `{ done?: boolean, comment?: string }`, apply `done` always, and apply `comment` only if it has not been set before. This prevents overwriting without an additional toggle endpoint.

7. **Psychologist can only reply once.** Once the `psychologist_reply` column is set, subsequent PATCH requests with a reply body should return `400 ReplyAlreadySet`. The check must be done at the service level before updating.

8. **Reaction accessibility window.** Decision 10 says reactions are toggleable "at any time." The backend should therefore allow reactions on any appointment state (upcoming, active, past) for completeness — though in practice a client would only have a recommendation to react to if an appointment has been active.

---

## Overview

EDG-51 adds a reaction model to psychologist recommendations. The client can toggle a `done`/`not done` status and submit a single text comment on any recommendation. The psychologist can see that reaction and post exactly one reply. This requires: a new `recommendation_reactions` table (migration); new service functions and API routes under the existing recommendations feature (created in EDG-50); frontend models, service calls, and UI components on the client-side past appointment detail view and the psychologist-side past appointment detail view.

Because no recommendation infrastructure exists yet in the backend, this plan also documents the `recommendations` table schema that EDG-50 must create — to ensure EDG-51's migration can add the reactions table with the correct foreign key. EDG-51 itself owns only the reactions table.

---

## Implementation Steps

### 1. Database — migration: `recommendations` table (prerequisite stub)

This step is owned by **EDG-50** but is documented here so the EDG-51 migration can reference the foreign key. The `recommendations` table must contain at minimum:

```sql
recommendations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  psycho_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

Do not create this table in EDG-51. Only proceed to step 2 once EDG-50 has applied this migration.

### 2. Database — migration: `recommendation_reactions` table

File: `backend/src/migrations/<timestamp>_create-recommendation-reactions.sql` (new)

Create with: `bun run migration:create -- --name create-recommendation-reactions`

The SQL body:

```sql
CREATE TABLE recommendation_reactions (
  recommendation_id  TEXT PRIMARY KEY REFERENCES recommendations(id) ON DELETE CASCADE,
  done               BOOLEAN NOT NULL DEFAULT false,
  client_comment     TEXT DEFAULT NULL,
  psychologist_reply TEXT DEFAULT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Design notes:
- One row per recommendation (`recommendation_id` is both PK and FK) — a recommendation can have at most one reaction record.
- `done` is freely toggleable.
- `client_comment` is set once; `NULL` means no comment yet.
- `psychologist_reply` is set once; `NULL` means no reply yet.
- `updated_at` is bumped on every `PATCH`.

### 3. Backend — `ALL_APP_TABLES` fixture update

File: `backend/src/test-fixtures/db.ts` (modify)

Add `'recommendation_reactions'` and `'recommendations'` to the `ALL_APP_TABLES` array so the test teardown truncates them. Add `'recommendation_reactions'` before `'recommendations'` to respect FK order.

### 4. Backend — models

File: `backend/src/features/recommendations/models.ts` (new, or extend whatever EDG-50 creates)

Add the `RecommendationReaction` interface:

```ts
export interface RecommendationReaction {
    recommendationId: string
    done: boolean
    clientComment: string | null
    psychologistReply: string | null
    updatedAt: string
}

export interface RecommendationWithReaction extends Recommendation {
    reaction: RecommendationReaction | null
}
```

`Recommendation` is defined in this same file by EDG-50.

### 5. Backend — services

File: `backend/src/features/recommendations/services.ts` (extend from EDG-50)

Add four service functions. All use the `db` template literal client from `config/db` following the same pattern as `backend/src/features/appointments/services.ts`.

**`upsertReaction(recommendationId: string, params: { done?: boolean; comment?: string }): Promise<RecommendationReaction>`**
- Issue an `INSERT INTO recommendation_reactions ... ON CONFLICT (recommendation_id) DO UPDATE SET ...` where:
  - `done` is always updated if provided.
  - `client_comment` is updated only when the existing row has `client_comment IS NULL` and a new comment is provided (use `CASE WHEN recommendation_reactions.client_comment IS NULL THEN $comment ELSE recommendation_reactions.client_comment END`).
  - `updated_at = NOW()`.
- Returns the full row with `recommendation_id AS "recommendationId"`, `done`, `client_comment AS "clientComment"`, `psychologist_reply AS "psychologistReply"`, `updated_at AS "updatedAt"`.

**`setReply(recommendationId: string, reply: string): Promise<RecommendationReaction>`**
- Updates `psychologist_reply = $reply, updated_at = NOW()` where `recommendation_id = $id`.
- The route layer checks for `ReplyAlreadySet` before calling this.
- Returns the updated row.

**`findReaction(recommendationId: string): Promise<RecommendationReaction | null>`**
- `SELECT ... FROM recommendation_reactions WHERE recommendation_id = $id`.

**`findRecommendationWithReaction(id: string): Promise<RecommendationWithReaction | null>`**
- Extends (or adds alongside) the existing `findRecommendationById` to `LEFT JOIN recommendation_reactions rr ON rr.recommendation_id = r.id` so the reaction is always included in the fetched recommendation.

### 6. Backend — client-facing routes (react)

File: `backend/src/features/recommendations/client-routes.ts` (new)

```
PATCH /api/appointments/:appointmentId/recommendations/:recommendationId/reaction
```

Guard: `authorized`, `onlyClientRequest`.

Logic:
1. Read `appointmentId` and `recommendationId` from params.
2. Read `{ done, comment }` from body. Both are optional; at least one must be present (return `400 BadRequest` if both are absent).
3. Verify the appointment belongs to this client: `SELECT 1 FROM appointments WHERE id = $appointmentId AND client_id = $userId`. Return `404` if not found.
4. Verify the recommendation belongs to this appointment: `SELECT 1 FROM recommendations WHERE id = $recommendationId AND appointment_id = $appointmentId`. Return `404` if not found.
5. If `comment` is provided: fetch the current reaction; if `clientComment` is already non-null, return `400 CommentAlreadySet` with message `"You have already submitted a comment on this recommendation."`.
6. Call `upsertReaction(recommendationId, { done, comment })`.
7. Return `200 { reaction }`.

### 7. Backend — psychologist-facing routes (reply)

File: `backend/src/features/recommendations/routes.ts` (new or extend from EDG-50)

```
PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId/reply
```

Guard: `authorized`, `onlyPsychoRequest`.

Logic:
1. Read params. Verify appointment belongs to this psychologist-client pair. Return `404` if not found.
2. Verify the recommendation belongs to this appointment (`SELECT 1 FROM recommendations WHERE id = $recommendationId AND appointment_id = $appointmentId`). Return `404` if not found.
3. Read `{ reply }` from body. Return `400 BadRequest` if `reply` is absent or empty string.
4. Fetch the current reaction via `findReaction(recommendationId)`. If `psychologistReply` is already non-null, return `400 ReplyAlreadySet` with message `"You have already replied to this recommendation."`.
5. Call `setReply(recommendationId, reply)`.
6. Return `200 { reaction }`.

### 8. Backend — register routes in `app.ts`

File: `backend/src/config/app.ts` (modify)

Add two new route registrations following the existing pattern:

```ts
import { recommendationRoutes } from '../features/recommendations/routes'
import { clientRecommendationRoutes } from '../features/recommendations/client-routes'

app.route('/api/clients/:clientId/appointments', recommendationRoutes)
app.route('/api/appointments', clientRecommendationRoutes)
```

Note: `recommendationRoutes` registers under `/:appointmentId/recommendations/...` and mounts under the same `/api/clients/:clientId/appointments` prefix as `appointmentRoutes`. `clientRecommendationRoutes` registers under `/:appointmentId/recommendations/...` and mounts under `/api/appointments`.

### 9. Frontend — models

File: `frontend/app/models/recommendation.ts` (new)

```ts
export interface RecommendationReaction {
    recommendationId: string
    done: boolean
    clientComment: string | null
    psychologistReply: string | null
    updatedAt: string
}

export interface Recommendation {
    id: string
    appointmentId: string
    psychoId: string
    clientId: string
    content: string
    createdAt: string
    reaction: RecommendationReaction | null
}

export interface UpsertReactionDTO {
    done?: boolean
    comment?: string
}

export interface SetReplyDTO {
    reply: string
}
```

### 10. Frontend — service

File: `frontend/app/services/recommendation.service.ts` (new)

Follows the same pattern as `frontend/app/services/appointment.service.ts`. Exports `recommendationService` with:

- `getList(clientId: string, appointmentId: string)` — `GET /clients/:clientId/appointments/:appointmentId/recommendations` (psycho role)
- `getClientList(appointmentId: string)` — `GET /appointments/:appointmentId/recommendations` (client role)
- `react(appointmentId: string, recommendationId: string, data: UpsertReactionDTO)` — `PATCH /appointments/:appointmentId/recommendations/:recommendationId/reaction` (client role)
- `reply(clientId: string, appointmentId: string, recommendationId: string, data: SetReplyDTO)` — `PATCH /clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId/reply` (psycho role)

### 11. Frontend — `RecommendationCard` component

File: `frontend/app/components/RecommendationCard.tsx` (new)

A presentational component that renders a single recommendation and its reaction state. Props:

```ts
interface RecommendationCardProps {
    recommendation: Recommendation
    role: 'client' | 'psychologist'
    onToggleDone?: (recommendationId: string, done: boolean) => Promise<void>
    onSubmitComment?: (recommendationId: string, comment: string) => Promise<void>
    onSubmitReply?: (recommendationId: string, reply: string) => Promise<void>
}
```

Renders:
- The recommendation `content` text.
- A toggle button or checkbox for done/not-done status (client only; psychologist sees read-only).
- If `role === 'client'`:
  - If `reaction.clientComment` is null: show a text area and a submit button for the comment. On submit call `onSubmitComment`.
  - If `reaction.clientComment` is non-null: show the comment read-only.
- If `role === 'psychologist'`:
  - Show the client's comment (if any).
  - If `reaction.psychologistReply` is null: show a text area and submit button for the reply. On submit call `onSubmitReply`.
  - If `reaction.psychologistReply` is non-null: show it read-only.
- Use shadcn/ui components: `Card`, `CardContent`, `Checkbox` (or `Button` toggle), `Textarea`, `Button`.

### 12. Frontend — `useRecommendations` hook

File: `frontend/app/hooks/useRecommendations.ts` (new)

Wraps `recommendationService.getList` (psycho) or `recommendationService.getClientList` (client). Takes `{ clientId?, appointmentId, role }` and returns `{ recommendations, isLoading, refetch }`.

Follows the same pattern as `useCurrentAppointment` in `frontend/app/hooks/useCurrentAppointment.ts`.

### 13. Frontend — past appointment detail view (psychologist)

File: `frontend/app/routes/psychologist/session.tsx` (modify)

The existing `session.tsx` currently shows `"This is a past appointment. Detail view coming in EDG-21."` for past appointments. Replace that branch with a real past appointment detail view that:
- Fetches recommendations via `useRecommendations({ clientId, appointmentId, role: 'psychologist' })`.
- Renders each `Recommendation` using `RecommendationCard` with `role="psychologist"`, `onSubmitReply` wired to `recommendationService.reply(...)`.
- On reply success, calls `refetch()` to reload the list.
- Shows a toast on error.

### 14. Frontend — past appointment detail view (client)

File: `frontend/app/routes/client/appointment-detail.tsx` (modify)

The existing `appointment-detail.tsx` currently shows `"This is a past appointment. Detail view coming in EDG-24."` for past appointments. Replace that branch with a real past appointment detail view that:
- Fetches recommendations via `useRecommendations({ appointmentId, role: 'client' })`.
- Renders each `Recommendation` using `RecommendationCard` with `role="client"`, `onToggleDone` and `onSubmitComment` wired to `recommendationService.react(...)`.
- On reaction success, calls `refetch()` to reload the list.
- Shows a toast on error.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<timestamp>_create-recommendation-reactions.sql` | SQL migration creating the `recommendation_reactions` table |
| `backend/src/features/recommendations/models.ts` | Backend TypeScript interfaces for `Recommendation`, `RecommendationReaction`, `RecommendationWithReaction` |
| `backend/src/features/recommendations/services.ts` | Raw SQL service functions: `upsertReaction`, `setReply`, `findReaction`, `findRecommendationWithReaction` |
| `backend/src/features/recommendations/routes.ts` | Psychologist-facing routes: GET list, PATCH reply |
| `backend/src/features/recommendations/client-routes.ts` | Client-facing routes: GET list, PATCH reaction |
| `backend/src/features/recommendations/routes.test.ts` | Backend integration tests for all recommendation routes |
| `frontend/app/models/recommendation.ts` | Frontend TypeScript interfaces for recommendation and reaction shapes |
| `frontend/app/services/recommendation.service.ts` | Axios-based service wrappers for all recommendation API calls |
| `frontend/app/components/RecommendationCard.tsx` | Presentational component rendering a recommendation + reaction UI |
| `frontend/app/hooks/useRecommendations.ts` | Hook to fetch recommendations for an appointment (role-aware) |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/test-fixtures/db.ts` | Add `'recommendation_reactions'` and `'recommendations'` to `ALL_APP_TABLES` |
| `backend/src/config/app.ts` | Register `recommendationRoutes` and `clientRecommendationRoutes` |
| `frontend/app/routes/psychologist/session.tsx` | Replace `past` branch placeholder with real recommendation list + reply UI |
| `frontend/app/routes/client/appointment-detail.tsx` | Replace `past` branch placeholder with real recommendation list + react UI |

---

## Tests

### What to test

**Backend** (`backend/src/features/recommendations/routes.test.ts`)

Follow the exact pattern of `backend/src/features/appointments/routes.test.ts`: use `bun:test`, `app.request`, `insertTestUser`, `asUser`, `linkClientToPsycho` fixtures.

- `PATCH /api/appointments/:appointmentId/recommendations/:recommendationId/reaction`:
  - happy path: client toggles `done` to `true`, returns `200 { reaction }` with `done: true`
  - happy path: client submits a `comment`, returns `200 { reaction }` with `clientComment` set
  - happy path: client toggles `done` again after already setting comment, returns `200` with comment preserved
  - `400 CommentAlreadySet` when client tries to submit a second comment
  - `400 BadRequest` when neither `done` nor `comment` is provided in body
  - `404` when appointment does not belong to this client
  - `404` when recommendation does not belong to this appointment
  - `403` when request is made with `Helpsycho-User-Role: psycho` header

- `PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:recommendationId/reply`:
  - happy path: psychologist submits reply, returns `200 { reaction }` with `psychologistReply` set
  - `400 ReplyAlreadySet` when psychologist tries to submit a second reply
  - `400 BadRequest` when `reply` is missing or empty
  - `404` when appointment does not belong to this psychologist-client pair
  - `404` when recommendation does not belong to this appointment
  - `403` when request is made with `Helpsycho-User-Role: client` header

**Frontend**

- `RecommendationCard` component:
  - renders recommendation content text
  - client role: renders done/not-done toggle
  - client role: renders comment textarea when `clientComment` is null
  - client role: hides textarea and shows read-only comment when `clientComment` is non-null
  - client role: calls `onToggleDone` with correct args on toggle
  - client role: calls `onSubmitComment` with correct args on form submit
  - psychologist role: does not render toggle
  - psychologist role: renders client comment read-only when present
  - psychologist role: renders reply textarea when `psychologistReply` is null
  - psychologist role: hides reply textarea and shows read-only reply when `psychologistReply` is non-null
  - psychologist role: calls `onSubmitReply` with correct args on form submit

- `session.tsx` past branch:
  - shows loading state while recommendations are fetching
  - renders recommendation cards when data is loaded
  - shows empty state when no recommendations exist
  - calls `recommendationService.reply` on reply submit
  - shows `toast.error` on reply failure

- `appointment-detail.tsx` past branch:
  - shows loading state while recommendations are fetching
  - renders recommendation cards when data is loaded
  - shows empty state when no recommendations exist
  - calls `recommendationService.react` on done toggle
  - calls `recommendationService.react` on comment submit
  - shows `toast.error` on reaction failure

---

## Out of Scope

- Creating the `recommendations` table or the psychologist create-recommendation endpoint — that is EDG-50's responsibility.
- Fetching and displaying psychologist notes (EDG-48) or client impressions (EDG-49) on the past appointment views — those are separate tickets.
- Displaying the whiteboard snapshot on past appointment views (EDG-47).
- Any email notification when a client reacts or a psychologist replies — Decision 10 explicitly states "No notifications for now."
- Editing or deleting reactions or replies — Decision 10 says done/not-done is toggleable but has no edit/delete for comments or replies.
- Multiple-level threading beyond one reply — Decision 10 is explicit: one level deep only.
- The `GET` list endpoints for recommendations being fully built out — they are needed as the read surface for these views but the full listing feature (including notes, impressions, and snapshot in one payload) belongs to EDG-21 and EDG-24.
