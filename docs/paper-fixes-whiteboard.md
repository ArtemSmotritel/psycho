# Paper and diagram fixes by section: whiteboard rework and impression completion removal

This file merges two change sets, so each section can be edited in one pass:

- WB: the whiteboard code changed in the last commits.
- IC: remove every mention of `impression_completions` / `ImpressionCompletion` from the paper and from the diagrams that the paper uses.

Line numbers refer to `paper.md` as of 2026-11-22 and shift as changes apply. Each diagram sits with the section that uses it. Not checked: `classes.drawio.png` (an image, so it cannot be searched).

Note on the code: `backend/src/features/attachments/` still contains `ImpressionCompletion` code (`models.ts`, `services.ts`, `attachment-check.ts`, `client-routes.ts`). Code wins over the paper, so remove it from the code first, or the IC items would make the paper disagree with the code.

## What changed in the code (whiteboard)

- Sync protocol: the client sends `sync` with its file ids. The server replies with `sync_reply` (all elements and the file ids it wants). Files that the client lacks go first. After the reply, the client sends only elements that are newer than the revision it knows. The old protocol sent whole scenes with `scene_init`.
- Merge rule: the higher `version` wins. On a tie, the lower `versionNonce` wins. A sender with an old revision gets the newer server copy back.
- Saving: the first change starts one 5-second timer. Later changes do not restart it. A failed save retries after 30 seconds. The old design used a 3-second debounce.
- Storage: files moved from `appointments.whiteboard_files` to the new table `whiteboard_files`. Ending a session clears elements and files in the transaction that ends it, then closes the room with close code 1000.
- Connection rules: the server checks `Origin`. Close reasons are `Forbidden`, `Unauthorized`, `NotFound`, `AppointmentNotActive`, `Replaced`, `RateLimited` and `InternalError`. More than 300 messages per second closes the socket with 1013. One user may hold 5 connections per room.
- Limits: 500 elements per message, 20,000 elements per room, 100 files per room, 8 MiB per file, 64 MiB of files per room.
- Client: reconnect with backoff (0.5 s to 10 s, with jitter), and no reconnect after 1000 or 1008. The socket connects only after Excalidraw is ready. A 50 ms interval flushes changes. Library images shrink to at most 1440 px and 4 MiB.
- Tests: 18 merge tests and 29 WebSocket route tests with the real database, plus frontend hook and image tests.

## Section 2.6.1 Проведення сесій (lines 436–441)

WB text, lines 438–440:
- [ ] Replace "передає учаснику повний стан сцени" with the `sync` and `sync_reply` handshake. Files that the client lacks go first.
- [ ] Replace "критичні зміни сцени надсилаються миттєво" with the 50 ms flush that sends only changed elements.
- [ ] Replace the debounce description. The first change starts one timer, and constant drawing still saves.
- [ ] Add the reconnect step after a lost connection.
- [ ] Add that ending the session clears the stored state and closes the sockets.

WB diagram: Додаток Д (activity diagram). Source: `docs/diagrams/specs/dodatok-K-whiteboard-activity.md`. The filename still uses the old letter К.
- [ ] Replace `scene_init` with `sync` and `sync_reply`.
- [ ] Replace "цілісні знімки сцени" with the incremental element merge.
- [ ] Add the merge decision and the stale correction.
- [ ] Change the 3 s debounce to the 5 s timer.
- [ ] Add the reconnect loop.

## Section 2.6.3 Керування вкладеннями (lines 459–474)

IC text:
- [x] Line 466: remove "та один раз доповнювати власне враження".
- [x] Line 470: in delete rule 2, remove "і враження, яке вже має відповідь". Rule 2 then covers recommendations only.

IC diagrams:
- [x] `docs/diagrams/attachment-use-cases.drawio` and `.puml`: remove the use case "Залишити відповідь на враження (один раз)" (`IC` in the `.puml`).
- [x] `docs/diagrams/attachment-use-cases.drawio`: in the constraints note, remove "враження з відповіддю клієнта видалити не можна".
- [x] `docs/diagrams/attachment-state-machine.puml`: remove the transition `відповісти() (враження)` (`PATCH /attachments/{id}/complete`). Remove the terminal state `i2` and its note.
- [x] Confirm that the state machine belongs to this section. The paper does not name it.

## Section 2.6.6 Концептуальна модель БД (lines 498–509)

Decision: the conceptual and logical models gain a new entity "Файл дошки" (WhiteboardFile) for the board images. The existing entity "Файл" (File) is a different thing (uploaded attachment and library files), so keep the two names distinct.

Text (this section covers lines 498–509; the relation sentences are in 2.6.7):
- [x] IC, line 507: change "Дві допоміжні сутності" to "Одна допоміжна сутність". Remove the sentence about "Виконання враження" (ImpressionCompletion).
- [x] WB, line 506: in the entity "Сесія", remove "файли зображень" from the board state. Keep the elements and the snapshot.
- [x] WB, after line 506: add a sentence for the new entity "Файл дошки" (WhiteboardFile). It stores one image that participants placed on the board of a session: the file identifier that the board uses, the image data and the creation time. The entity is not a helper of attachments, so do not add it to the sentence about auxiliary entities.

Diagram (Рисунок 2.6). Source: `docs/diagrams/specs/dodatok-L-conceptual-er.md`.
- [x] IC: line 26: remove the `ImpressionCompletion` entity and its link.
- [x] WB: line 15: remove the attribute `whiteboard_files` from the entity `Appointment` (Сесія). The same removal applies to the drawn Рисунок 2.6.
- [x] WB: add the entity `WhiteboardFile` (Файл дошки): `file_id`, `appointment_id`, `data`, `created_at`. The key is the pair `appointment_id` and `file_id`.
- [x] WB: add the relation from `WhiteboardFile` to `Appointment`: many to one (a session has many board files; a file belongs to one session).

## Section 2.6.7 Даталогічна модель БД (lines 510–520)

Text:
- [x] IC, line 518: remove `ImpressionCompletion` from the one-to-one relation sentence. Remove the clause "а враження – щонайбільше одну відповідь клієнта". The IC plan puts this line in 2.6.6, but the line is under the 2.6.7 heading.
- [x] WB, near line 518: add a sentence for the relation "багато до одного" between "Файл дошки" (WhiteboardFile) and "Сесія". The composite primary key is the session identifier and the file identifier, so one file identifier occurs once in a session. Deleting a session deletes its board files.

Diagram (Рисунок 2.7). Sources: `datalogical.drawio`, `docs/diagrams/db-logical.txt`, `docs/diagrams/specs/dodatok-M-logical-db.md`.
- [x] IC: `datalogical.drawio` line 247: remove the table `t12` and its relation edges.
- [x] IC: `docs/diagrams/db-logical.txt`: remove the table at line 119 and the `Ref` at line 209.
- [x] IC: `docs/diagrams/specs/dodatok-M-logical-db.md`: remove lines 25 and 43 (the table and the 1—1 relation).
- [x] WB: remove the column `whiteboard_files` from the table `appointments`:
  - `datalogical.drawio` (the column appears near line 175).
  - `docs/diagrams/db-logical.txt` line 14.
  - `docs/diagrams/specs/dodatok-M-logical-db.md` line 15.
- [x] WB: add the table `whiteboard_files` in all three files: `appointment_id` (text, not null, foreign key to `appointments.id`, delete cascade), `file_id` (text, not null), `data` (text, not null), `created_at` (timestamptz, not null, default now). Composite primary key (`appointment_id`, `file_id`).
- [x] WB: add the relation `whiteboard_files.appointment_id` to `appointments.id` (many to one) in all three files.

## Section 3.3.1.1 Серверна частина дошки (lines 578–584)

WB text, lines 580–584 (the largest rewrite):
- [x] `RoomRegistry`, `saveTimers` and `SAVE_DEBOUNCE_MS = 3000` no longer exist. Describe `WhiteboardRooms` and the room fields (`elements`, `files`, `dirty`, `unsavedFiles`, `timer`, `saving`, `ended`).
- [x] Describe `flushRoom` and `persist` in place of `flushPendingSave`.
- [x] Add the `merge` module (`mergeElements`, `mergeFiles`, `diffFiles`, `decide`) and the `limits` constants.
- [x] Update `saveState(appointmentId, elements, newFiles)`.
- [x] Update the repo methods: `findStateByAppointmentId`, `updateElements`, `insertFile`, `clearState`.
- [x] Add the close codes, the `Origin` check, the rate limit and the connection cap.
- [x] Add that `clearState` runs in the transaction that ends the appointment.

WB diagram: Додаток И, рисунок И.1. Source: `docs/diagrams/whiteboard-class-diagram.puml`.
- [x] Replace `RoomRegistry` with `WhiteboardRooms`.
- [x] Fix the `Room` and `RoomConnection` fields.
- [x] Add `merge`, `limits` and the message types.
- [x] Replace `updateState` with `updateElements` and `insertFile`.
- [x] Add the link from `AppointmentsService` for ending a session.

## Section 3.3.1.2 Клієнтська частина дошки (lines 586–594)

WB text, lines 590–593:
- [x] Remove the buffer for an early scene. The socket connects only after Excalidraw is ready.
- [x] Replace the signature echo check with the map of known versions.
- [x] Remove the empty-array guard.
- [x] Replace `onWhiteboardChange(elements, appState, files)` with `onWhiteboardChange()`.
- [x] Add the `sync` handshake, the reconnect backoff and the no-reconnect close codes.
- [x] Describe the image shrinking in `WhiteboardImageInsert`: at most 1440 px and 4 MiB, file id `assoc-<id>`.

WB diagram: Додаток И, рисунок И.2. Source: `docs/diagrams/live-session-ui-class-diagram.puml`.
- [x] Fix the `onWhiteboardChange` signature.
- [x] Add the dependency of `WhiteboardImageInsert` on the image preparation function.

## Section 3.3.4 Реалізація бази даних (lines 619–859)

Decision: `whiteboard_files` takes the slot of the removed `impression_completions` as Table 3.13. No table is renumbered. Tables 3.14 to 3.17 and Table 3.18 keep their numbers. The total stays at 17 tables, 13 of them domain tables.

Text (the old IC and the new WB changes meet in lines 794–802):
- [x] IC and WB, line 794: replace the paragraph on `impression_completions` (it also wrongly says "психолога") with a paragraph on `whiteboard_files`. The paragraph says that the table stores the images of the board of one session. Each file is written once, because a file identifier names unchangeable content. The table stores the file as JSON text. Rows are deleted with the session or when the session ends. Table 3.13 lists the attributes.
- [x] IC and WB, lines 796–802: replace Table 3.13 "Атрибути таблиці “impression\_completions”" with Table 3.13 "Атрибути таблиці “whiteboard\_files”". Rows: `appointment_id` (TEXT, PK, FK, NOT NULL), `file_id` (TEXT, PK, NOT NULL), `data` (TEXT, NOT NULL), `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()). The primary key is composite; `appointment_id` references `appointments.id` with cascade delete.
- [x] Keep Tables 3.14 to 3.17 as they are. Their in-text references do not change.
- [x] Line 621: the count of 17 tables and 13 domain tables stays as it is.
- [x] Line 720: change "Стан дошки (елементи, файли й знімок)" to elements and snapshot only. Say that the files of the board are in the table `whiteboard_files`. Files are no longer stored in `appointments`.
- [x] Line 736: remove the `whiteboard_files` row (type JSONB) from Table 3.8. The column no longer exists in the code.

Diagrams:
- [x] Figure 3.1 (physical database diagram, in this section): remove the `appointments.whiteboard_files` column. Replace the table `impression_completions` with the table `whiteboard_files`, and its relation with the relation `whiteboard_files` to `appointments`.
- [x] Source spec `docs/diagrams/specs/dodatok-P-physical-db.md`: IC remove lines 41 and 63. WB remove the column `whiteboard_files` from the `appointments` entry (line 31) and add the new table.

## Section 3.4 Загальна діаграма класів (lines 860–872, Додаток Л)

Text: no whiteboard or IC change found.

WB diagrams. Sources: `docs/diagrams/general-class-diagram-backend.puml`, `docs/diagrams/general-class-diagram-backend-modules.puml`, `docs/diagrams/general-class-diagram-backend-and-frontend.drawio`, `docs/diagrams/specs/general-class-diagram.md`.
- [x] In the whiteboard domain, add `WhiteboardRooms` and the merge module next to Routes, Service and Repo.
- [x] In the spec, line 92 says `clearState` runs "when an appointment is deleted or changed". It runs when the appointment ends.
- [x] The frontend part is unchanged.

## Section 3.6 Тестування (lines 913–935) and Додаток Н

WB text:
- [x] Line 933: remove "крім обміну даними дошки через WebSocket, який перевірено вручну".
- [x] Describe the whiteboard tests: 18 merge tests and 29 route tests with the real database, plus the frontend hook tests.
- [x] Table 3.18 keeps its number (no renumbering in 3.3.4). The total 415 and the rows need a recount, and the table needs a new row for the whiteboard. Run the backend suite for the numbers. The IC removal may also change the attachments row.

Додаток Н (testing results table):
- [x] WB: rows 1, 4, 6 and 13 (about lines 1106–1123): replace "функціональним тестуванням" with the automated test results where they apply. The rows are about access checks, reconnect and state restore.
- [x] IC: line 1130, requirement 15: remove "та відповідь клієнта на запит враження (impression completion)".

## Conclusions of chapter 3 (lines 938–939)

- [x] WB: remove "Обмін даними дошки через WebSocket ... перевірено вручну".
- [x] WB: update the test count after the recount.
- [x] The number of tables stays 17, so no change to the table count.

## Overall conclusions (lines 950, 960)

- [x] WB: line 950: remove "Дошку ... перевірено вручну" and adjust the test count.
- [x] WB: line 960: remove "автоматичне перепідключення до дошки" from future work. It exists now.
- [x] IC: check lines 950–960 for the client reply to an impression. The text names "Клієнт реагує на рекомендації, психолог відповідає" (line 955); confirm that it does not describe the removed reply to an impression.

## Додаток Г Функціональні вимоги

- [x] IC: line 1045, requirement 15: remove "Клієнт може надати відповідь до враження.", "Враження, яке вже має відповідь, видалити не можна." and "Відповідь є одноразовою."
- [x] WB: no change. The whiteboard requirements are still valid.

## No change needed

- Sections 2.5, 2.7, 3.1 and 3.2, and the component diagram. The structure and the technology text are still correct.
- The structural scheme (Додаток Ж). Optional: name the files table in the data component "Сесії (зі станом дошки)" in `docs/diagrams/component-diagram.puml`.

## Order

All sections are independent. Apply 3.3.4 as one edit (Table 3.13 is replaced, nothing else is renumbered).
