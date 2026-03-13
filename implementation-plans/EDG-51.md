# Implementation Plan: EDG-51 — Client can react to recommendations (done/not done + comment)

## Resolved Questions

1. **`recommendations` table no longer exists** — recommendations are rows in the `attachments` table (`type='recommendation'`). The `recommendation_reactions` table FK references `attachments(id)`.

2. **"Client leaves one comment" — second submission**: Updating the `done` toggle is freely allowed at any time. The `comment` field is set once; a second `PATCH` with a non-null `comment` returns `400 CommentAlreadySet`.

3. **Psychologist reply**: One reply allowed per recommendation. Shown inline on the recommendation card for both roles. `400 ReplyAlreadySet` on second attempt.

4. **Reaction accessibility**: Reactions can be submitted on any appointment status (Decision 10: "toggleable at any time").

5. **Prerequisites**: EDG-48 (attachments table + shared services) and EDG-50 (recommendations routes) must be implemented first.

6. **Access control decisions**: 404 always on unauthorized access. Full URL chain validated. Past data accessible after link removal.

---

## Access Control Rules

Violations always return `404`.

### Client reaction route (`PATCH /api/appointments/:appointmentId/recommendations/:attachmentId/reaction`)

**Step 1 — appointment ownership**:
- Fetch appointment. Verify `appointment.clientId === user.id`. → `404` if not.

**Step 2 — attachment chain**:
- Fetch attachment by `attachmentId`. Verify ALL of:
  - `attachment.appointmentId === appointmentId`
  - `attachment.type === 'recommendation'`
- → `404` if any check fails (the client is allowed to react to any recommendation on their appointment, regardless of author).

**Step 3 — comment-once check** (when `comment` is provided):
- Fetch current reaction. If `clientComment` is already non-null → `400 CommentAlreadySet`.

**Additional edge cases:**
- Psychologists blocked by `onlyClientRequest`.
- Client cannot react to a recommendation on someone else's appointment (step 1).
- Client cannot react to a note or impression using this route (`type === 'recommendation'` check).
- Client cannot manipulate `attachmentId` to react to an attachment from a different appointment (step 2).

### Psychologist reply route (`PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId/reply`)

**Step 1 — appointment ownership**:
- Fetch appointment. Verify `appointment.psychoId === user.id` AND `appointment.clientId === clientId` (URL param). → `404` if not.

**Step 2 — attachment chain**:
- Fetch attachment. Verify ALL of:
  - `attachment.appointmentId === appointmentId`
  - `attachment.type === 'recommendation'`
  - `attachment.authorId === user.id` (can only reply to their own recommendation)
- → `404` if any check fails.

**Step 3 — reply-once check**:
- Fetch current reaction. If `psychologistReply` is already non-null → `400 ReplyAlreadySet`.

**Additional edge cases:**
- Clients blocked by `onlyPsychoRequest`.
- Psychologist A cannot reply to Psychologist B's recommendation (`authorId === user.id`).
- A psychologist cannot reply to a note or impression using this route.
- Manipulating `attachmentId` to target a recommendation from a different appointment is blocked.

---

## Overview

EDG-51 adds a reaction layer on top of recommendations. A `recommendation_reactions` table (one row per recommendation) tracks: `done` (freely toggleable boolean), `client_comment` (set once), and `psychologist_reply` (set once). New routes handle: client sets reaction (`PATCH /api/appointments/:appointmentId/recommendations/:attachmentId/reaction`), psychologist posts reply (`PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId/reply`). The frontend renders reactions inline on recommendation cards, upgrading the read-only views added in EDG-50.

---

## Implementation Steps

### 1. Database Migration

Create `backend/src/migrations/<timestamp>_create-recommendation-reactions.sql`:

```sql
CREATE TABLE recommendation_reactions (
    attachment_id      TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
    done               BOOLEAN NOT NULL DEFAULT false,
    client_comment     TEXT DEFAULT NULL,
    psychologist_reply TEXT DEFAULT NULL,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`attachment_id` is both PK and FK — one reaction row per recommendation. The FK references `attachments(id)` (not a `recommendations` table). Application-level logic ensures only `type='recommendation'` attachments get reactions.

Add `'recommendation_reactions'` to `ALL_APP_TABLES` in `backend/src/test-fixtures/db.ts`.

---

### 2. Backend — Reaction Model

Add to `backend/src/features/attachments/models.ts`:

```ts
export interface RecommendationReaction {
    attachmentId: string
    done: boolean
    clientComment: string | null
    psychologistReply: string | null
    updatedAt: string
}

export interface AttachmentWithReaction extends Attachment {
    reaction: RecommendationReaction | null
}
```

---

### 3. Backend — Reaction Services

Add to `backend/src/features/attachments/services.ts`:

```ts
findReaction(attachmentId: string): Promise<RecommendationReaction | null>
// SELECT ... FROM recommendation_reactions WHERE attachment_id = $attachmentId

upsertReaction(attachmentId: string, params: { done?: boolean; comment?: string }): Promise<RecommendationReaction>
// INSERT INTO recommendation_reactions (attachment_id, done, client_comment)
//   VALUES ($attachmentId, COALESCE($done, false), $comment)
// ON CONFLICT (attachment_id) DO UPDATE SET
//   done = COALESCE(EXCLUDED.done, recommendation_reactions.done),
//   client_comment = CASE
//     WHEN recommendation_reactions.client_comment IS NULL THEN EXCLUDED.client_comment
//     ELSE recommendation_reactions.client_comment
//   END,
//   updated_at = NOW()
// RETURNING ...

setReply(attachmentId: string, reply: string): Promise<RecommendationReaction>
// UPDATE recommendation_reactions SET psychologist_reply = $reply, updated_at = NOW()
// WHERE attachment_id = $attachmentId RETURNING ...
```

Also add `listAttachmentsWithReactions(appointmentId, type)` — joins `attachments` with `recommendation_reactions` via LEFT JOIN, returns `AttachmentWithReaction[]`. Used by the updated GET list routes.

---

### 4. Backend — Client Reaction Route

Add to `backend/src/features/attachments/recommendations-client-routes.ts` (from EDG-50):

```
PATCH /:attachmentId/reaction
```

Guard: `authorized` + `onlyClientRequest`.

Applies **Client reaction access control rules** defined above.

1. Step 1 (appointment ownership: `appointment.clientId === user.id`).
2. Step 2 (attachment chain: `appointment_id` match + `type === 'recommendation'`).
3. Body: `{ done?: boolean, comment?: string }`. Return `400 BadRequest` if both absent.
4. Step 3 (comment-once: if `comment` provided, check existing reaction → `400 CommentAlreadySet` if already set).
5. `upsertReaction(attachmentId, { done, comment })`.
6. Returns `200 { reaction }`.

---

### 5. Backend — Psychologist Reply Route

Add to `backend/src/features/attachments/recommendations-psycho-routes.ts` (from EDG-50):

```
PATCH /:attachmentId/reply
```

Guard: `authorized` + `onlyPsychoRequest`.

Applies **Psychologist reply access control rules** defined above.

1. Step 1 (appointment ownership: `psychoId === user.id` AND `clientId` URL param matches).
2. Step 2 (attachment chain: `appointment_id` match + `type === 'recommendation'` + `authorId === user.id`).
3. Body: `{ reply: string }`. Return `400 BadRequest` if absent or empty.
4. Step 3 (reply-once: fetch current reaction → `400 ReplyAlreadySet` if `psychologistReply` already set).
5. `setReply(attachmentId, reply)`.
6. Returns `200 { reaction }`.

---

### 6. Backend — Update GET Routes to Include Reactions

Update the `GET /` handlers in both `recommendations-psycho-routes.ts` and `recommendations-client-routes.ts` to use `listAttachmentsWithReactions(appointmentId, 'recommendation')` instead of `listAttachments(...)`. This ensures reactions are always returned with the recommendation list, so the frontend doesn't need a separate fetch.

Response shape becomes: `{ recommendations: AttachmentWithReaction[] }`.

---

### 7. Backend — Tests

Create `backend/src/features/attachments/reactions-routes.test.ts`.

**`PATCH /api/appointments/:appointmentId/recommendations/:attachmentId/reaction`**
- Returns 200 with `done: true` when toggling done.
- Returns 200 with `clientComment` set when submitting comment.
- Preserves existing comment when toggling `done` a second time (comment not overwritten).
- Returns 400 `CommentAlreadySet` on second comment attempt.
- Returns 400 `BadRequest` when neither `done` nor `comment` is provided.
- Returns 404 when `appointmentId` does not belong to this client.
- Returns 404 when `attachmentId` belongs to a different appointment.
- Returns 404 when `attachmentId` has `type !== 'recommendation'` (e.g. a note ID).
- Returns 403 with psycho role header (blocked by `onlyClientRequest`).
- Returns 401 unauthenticated.

**`PATCH /api/clients/:clientId/appointments/:appointmentId/recommendations/:attachmentId/reply`**
- Returns 200 with `psychologistReply` set.
- Returns 400 `ReplyAlreadySet` on second reply attempt.
- Returns 400 `BadRequest` when `reply` is absent or empty string.
- Returns 404 when `appointmentId` does not belong to this psychologist.
- Returns 404 when `clientId` URL param does not match the appointment's actual client.
- Returns 404 when `attachmentId` belongs to a different appointment.
- Returns 404 when `attachmentId` has `type !== 'recommendation'`.
- Returns 404 when recommendation was authored by a different psychologist.
- Returns 403 with client role header (blocked by `onlyPsychoRequest`).
- Returns 401 unauthenticated.

---

### 8. Frontend — Reaction Model

Add to `frontend/app/models/attachment.ts`:

```ts
export interface RecommendationReaction {
    attachmentId: string
    done: boolean
    clientComment: string | null
    psychologistReply: string | null
    updatedAt: string
}

export interface AttachmentWithReaction extends Attachment {
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

---

### 9. Frontend — Update Recommendation Service

Update `frontend/app/services/recommendation.service.ts` (from EDG-50):

- Change return types of `getList` and `getClientList` from `Attachment[]` to `AttachmentWithReaction[]`.
- Add:
  ```ts
  react: (appointmentId: string, attachmentId: string, data: UpsertReactionDTO) =>
      api.patch<{ reaction: RecommendationReaction }>(`/appointments/${appointmentId}/recommendations/${attachmentId}/reaction`, data),
  reply: (clientId: string, appointmentId: string, attachmentId: string, data: SetReplyDTO) =>
      api.patch<{ reaction: RecommendationReaction }>(`/clients/${clientId}/appointments/${appointmentId}/recommendations/${attachmentId}/reply`, data),
  ```

---

### 10. Frontend — `RecommendationCard` Component

Create `frontend/app/components/RecommendationCard.tsx`.

Props:
```ts
interface RecommendationCardProps {
    recommendation: AttachmentWithReaction
    role: 'client' | 'psychologist'
    onToggleDone?: (id: string, done: boolean) => Promise<void>
    onSubmitComment?: (id: string, comment: string) => Promise<void>
    onSubmitReply?: (id: string, reply: string) => Promise<void>
}
```

Renders:
- `recommendation.name` (bold heading) and `recommendation.text`.
- **Client role**: Checkbox/toggle for done status. If `reaction.clientComment` is null: show textarea + submit button. If non-null: show comment read-only.
- **Psychologist role**: Shows `done` status read-only. Shows client comment (if any). If `reaction.psychologistReply` is null: textarea + submit. If non-null: reply read-only.
- Uses shadcn/ui `Card`, `Checkbox`, `Textarea`, `Button`.

---

### 11. Frontend — Update `session.tsx` (psychologist)

Modify `frontend/app/routes/psychologist/session.tsx`.

Replace the plain recommendation list (from EDG-50) with `<RecommendationCard>` components (`role="psychologist"`). Wire `onSubmitReply` to `recommendationService.reply(...)`. On success, call `refetch()`. Show `toast.error` on failure.

---

### 12. Frontend — Update `appointment-detail.tsx` (client)

Modify `frontend/app/routes/client/appointment-detail.tsx`.

Replace the read-only recommendation list (from EDG-50) with `<RecommendationCard>` components (`role="client"`). Wire `onToggleDone` and `onSubmitComment` to `recommendationService.react(...)`. On success, call `refetch()`. Show `toast.error` on failure.

---

## Files to Create

| Path | Description |
|------|-------------|
| `backend/src/migrations/<ts>_create-recommendation-reactions.sql` | `recommendation_reactions` table referencing `attachments(id)` |
| `backend/src/features/attachments/reactions-routes.test.ts` | Backend integration tests for reaction and reply routes |
| `frontend/app/components/RecommendationCard.tsx` | Recommendation card with inline reaction/reply UI |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/src/features/attachments/models.ts` | Add `RecommendationReaction`, `AttachmentWithReaction` |
| `backend/src/features/attachments/services.ts` | Add `findReaction`, `upsertReaction`, `setReply`, `listAttachmentsWithReactions` |
| `backend/src/features/attachments/recommendations-client-routes.ts` | Add `PATCH /:attachmentId/reaction`; update `GET /` to use `listAttachmentsWithReactions` |
| `backend/src/features/attachments/recommendations-psycho-routes.ts` | Add `PATCH /:attachmentId/reply`; update `GET /` to use `listAttachmentsWithReactions` |
| `backend/src/test-fixtures/db.ts` | Add `'recommendation_reactions'` to `ALL_APP_TABLES` |
| `frontend/app/models/attachment.ts` | Add `RecommendationReaction`, `AttachmentWithReaction`, `UpsertReactionDTO`, `SetReplyDTO` |
| `frontend/app/services/recommendation.service.ts` | Update return types; add `react` and `reply` methods |
| `frontend/app/routes/psychologist/session.tsx` | Replace recommendation list with `RecommendationCard` components |
| `frontend/app/routes/client/appointment-detail.tsx` | Replace recommendation list with `RecommendationCard` components |

---

## Tests

**Backend** — see step 7.

**Frontend**

- `RecommendationCard` (client role): renders name/text; renders done toggle; renders comment textarea when no comment; renders read-only comment when set; calls `onToggleDone` on toggle; calls `onSubmitComment` on submit.
- `RecommendationCard` (psychologist role): does not render toggle; renders client comment read-only; renders reply textarea when no reply; renders read-only reply when set; calls `onSubmitReply` on submit.
- `session.tsx` past branch: calls `recommendationService.reply` on reply submit; shows toast on error.
- `appointment-detail.tsx` past branch: calls `recommendationService.react` on done toggle; calls `recommendationService.react` on comment submit; shows toast on error.

---

## Out of Scope

- Creating recommendations — EDG-50.
- Multiple-level threading — Decision 10: one level only.
- Email notification on reaction/reply — Decision 10: no notifications.
- Editing or deleting reactions/replies.
