# Whiteboard: messages to the user (plan, not implemented)

Status: a plan. No code is written. Review it, answer the open questions, then implement.

Goal: show a message only when the case affects the user and the user can act on it.
Messages are short, state the effect, and give an action where one exists.

## Cases with a message

| Case | Why it matters | Text |
|---|---|---|
| The connection is lost for more than 2 seconds (indicator on the page, not a toast) | The other person does not see new drawings. The client sends them after it reconnects, if the page stays open. | "Connection lost. Reconnecting. Keep this page open." |
| The room has 100 files or 64 MiB of files | The user keeps adding images that the other person never sees. | "Image limit reached. New images are not shared." |
| The room has 20,000 elements | The same effect for drawings. Deleted elements stay in the room, so deleting does not free space. The text must not say "delete". | "The board is full. New drawings are not shared." |
| Close reason `Unauthorized` (the session expired, found after a reconnect) | The user can fix it. | "Your session expired. Sign in again to use the whiteboard." |
| Close reasons `Forbidden`, `NotFound` | The socket never reconnects. | "The whiteboard is not available. Reload the page." |
| Close reason `InvalidMessages` | The socket never reconnects. | "Sync stopped. Reload the page." |
| Library image too large after shrinking (existing toast) | The user can choose another image. | "This image is too large. Choose a smaller one." |
| Library insert fails for another reason (existing toast) | The user can retry. | "Could not add the image. Try again." |

## Cases with no message

| Case | Reason |
|---|---|
| More than 5,000 elements in one message | The client batches, so it never sends this. |
| Malformed element or file, a file id that does not match, `sync` with more than 100 file ids | Our client never sends them. |
| An element above 8 MiB of JSON (server rejects it, or client skips it) | It needs about 100,000 points in one stroke or more. Not checked: whether Excalidraw allows it. The user cannot fix it. The log stays. |
| A file above the file limit | Library insert and Excalidraw's own tool shrink or reject images first. Only a dropped scene file reaches it (out of scope). |
| A failed save | The user can do nothing. The server retries every 30 seconds and logs the failure. |
| A stored scene that loaded cut at 20,000 elements | The room cap prevents such a scene. The user can do nothing. |
| A server message that is not valid JSON | It cannot happen with our server. |
| Close 1013 (rate limit), 1011 (server error), a frame or queue close | The client reconnects at once. The offline indicator covers a longer outage. |
| Close reasons `AppointmentEnded`, `AppointmentNotActive` | The ended modal on the client page covers this. The psychologist ends the appointment themselves. |

## Changes

### Backend (`backend/src/features/whiteboard/`)

1. `models.ts`: add `{ type: 'notice'; code: 'room_elements_full' | 'room_files_full' }` to the outgoing messages.
2. `merge.ts`: make `mergeElements` and `mergeFiles` report which cap caused a rejection.
3. `rooms.ts`: send the notice to the sender only. Send each code at most once for each connection, so a full room does not send a notice on every change.
4. `rooms.ts`: do not count room-cap rejections as invalid. Only malformed input counts toward the 20 that close with 1008.

### Frontend

1. Add `frontend/app/utils/whiteboard-messages.ts` with the texts above.
2. `useWhiteboardSync.ts`: show a toast for each `notice` and for each permanent close reason. Use the code as the toast id, so a repeat does not stack.
3. `useWhiteboardSync.ts`: return `status` (`connecting`, `connected`, `reconnecting`, `closed`) in place of `connected`. The two live pages do not read `connected` today.
4. Add `WhiteboardStatus` to `routes/psychologist/live-session.tsx` and `routes/client/live-appointment.tsx`. It shows the offline text after 2 seconds in the `reconnecting` state. It stays hidden while Excalidraw loads, so the first connection shows no flash.
5. `WhiteboardImageInsert.tsx`: change the two texts. Update `whiteboard-image-insert.test.tsx` and the `ImageTooLargeError` message in `utils/whiteboard-image.ts`.

### Tests

- Backend, with the real WebSocket:
  - A notice for each code.
  - A room-cap rejection does not close the socket after 20 items.
  - The same code sends only one notice for each connection.
- Frontend hook:
  - A notice produces a toast with the code as id.
  - Each close reason gives the right result.
  - The status changes.
  - The hook tests need `sonner` mocked. That is the only mock.
- Frontend component: `WhiteboardStatus` renders in `reconnecting` after 2 seconds and renders nothing otherwise.
- A mutation check on the new server logic.

### Docs

Update `docs/whiteboard-sync-notes.md` with the notice message and the close-reason table.

## Not in the plan

- `save_failed`, `save_ok` and `scene_truncated` notices.
- Client toasts for a skipped element or file.
- Group F: a dropped `.excalidraw` file still replaces the scene with no check (the `onDropCapture` blocker is not requested).
- The upload limit and type check for associative images.
- A byte cap for all elements together.

## Open questions

1. **"Board is full" message.** The room reaches 20,000 elements only after very long use, so the message may never appear. It stays in the plan because without it a user draws into a board that the other person cannot see. Decide: keep it, or drop it.
2. **Sign-in message.** Check how the app handles other expired sessions (`API_UNAUTHORIZED_EVENT` in the auth context) before the text is final. The toast might need to start a log out, or only inform.
