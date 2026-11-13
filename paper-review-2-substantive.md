# Paper review 2 — substantive issues

Source: `paper.md` (line numbers refer to it). Compared against `backend/src`, `frontend/app`, `backend/src/migrations` and `psychodb_dump.sql`.
Quick typo/format fixes are in `paper-review-1-quick-fixes.md`.

**Severity**: **H** = the paper states something the code contradicts, or the paper contradicts itself, in a way a reviewer can check. **M** = imprecise, incomplete or weakly argued. **L** = polish or optional.

**Limits of this review**
- I did not run the application or the tests. Test counts come from counting `it(` blocks.
- The diagrams and screenshots are embedded images. I could not inspect them. Statements that describe a figure (for example "on the diagram these two checks are merged into one rhombus", line 561) are unverified.
- `docs/` was not used, as requested. The code is the reference.

---

## Title page, table of contents, abbreviations

Nothing substantive. See the quick-fix file.

## Вступ

- **M** (line 143) "Останніми роками попит … значно зріс" and the pandemic/war claim have no source. Add a citation or soften.
- **L** (lines 145–153) Task 6 says "Провести тестування", but chapter 3 conclusions and the general conclusions are empty (see "Висновки" below).

## 1.1 Актуальність

- **M** (line 164) The text promises "подальший аналіз і збір зворотного зв’язку". No requirement and no feature provides analysis. Remove "аналіз", or add the feature.
- **M** (line 166) The "6–12 місяців" figure has no direct source. The only citation, [3], appears two paragraphs later (line 167) and concerns telehealth use. Confirm that [3] supports it, or remove the number.

## 1.2 Огляд систем

- **H** (1.2.3, lines 223 vs 229) The text says the tools lack "інтеграції" and that data "фрагментуються". The advantage list then says "легка інтеграція з іншими інструментами". Remove that advantage, or rewrite it as "існує API, але зв’язки доводиться будувати вручну".
- **M** (1.2.1/1.2.2 vs table 1.1, lines 188–219 vs 246–248) The table does not match the text.
  - TheraPlatform: the text says "клієнти не можуть переглядати власний прогрес" and "фокус на загальній практиці". The table omits both. The table lists "Електронна медична картка" as an advantage; the text does not.
  - SimplePractice: the text says "обмежена підтримка … голосових заміток". The table omits it.
  - Make each system's advantage/disadvantage list and its table row say the same thing.
- **M** (lines 240–248) The comparison has no criteria. Chapter 1 defines six problems (lines 170–175). A matrix "system × problem" (whiteboard, post-session feedback, client progress, reminders, centralised history, price) would show the gap directly. Add a row for the proposed system.
- **L** (lines 183, 203, 217–219) Absolute statements about commercial products ("жодна … не забезпечує", "відсутність структурованої системи…") rest on [4] and [5] only. Check them against the vendor documentation or soften to "за результатами огляду".

## 1.3 Огляд технологій

- **M** (lines 254, 255; NFR 3 at line 340) Line 254 says users join "з будь-якого пристрою". Line 255 lists "ноутбуки, планшети". NFR 3 says "комп’ютерах і планшетах". Smartphones are mentioned as a drawback of native apps, yet never as a target of the web app. Decide the supported devices and state it once.
- **M** (line 256) "Він також полегшує інтеграцію з хмарними сервісами (…, сховищем файлів)". The system stores files on the local disk of the host (line 522) and is deliberately single-instance (line 524). Remove "сховищем файлів" or say the storage is local.
- **L** The section is titled "Огляд технологій", but it compares only platform types (web, desktop, mobile). The technologies are chosen in 3.1. Rename to "Вибір типу застосунку" or add a short technology survey.

## 1.4 Постановка завдання

- **M** (item 3, line 265) "автоматичну зміну статусу сесії". The status is not stored; it is computed from times (line 463; `APPOINTMENT_STATUS_EXPR` in `appointments/repo.ts`). The moves "upcoming → active" and "active → past" are manual actions of the psychologist (`PATCH …/start`, `PATCH …/end`). Rewrite.
- **H** (whole list) Starting a session and ending it are never stated as a requirement. In the code a client can open the board only when the psychologist has started the session (`whiteboard/routes.ts:121`: `status !== 'active'` closes the socket with code 1008). The start step is also needed by 2.6.1 ("сесія є активною"). Add a requirement (and a user story, and a row in appendix Г and appendix Л) for "Початок і завершення сесії психологом", including the rule "one active session per psychologist" (`AnotherAppointmentActive`, `appointments/services.ts`).
- **M** (item 6, line 268) Notes are described as created "після сесій". Appendix Г (line 946) and 2.3 (line 323) say "під час або після". Use the same wording.
- **L** The generalised list has no item for client contact data (FR 23) or for the dashboards (FR 18, FR 20).

## 2.1 Моделювання бізнес-процесів

- **H** (line 289) "Психолог має повні адміністративні можливості в системі". The system has no administrator functions. A psychologist sees only own clients and own data (NFR 2, line 339). Replace with "Психолог керує власною практикою: …".
- **M** (line 292) "Доступ є і в клієнта, який уже має хоча б одного психолога. Інакше клієнт не може приймати участь у сесіях." The two sentences do not say what "доступ" means or what happens otherwise. Rewrite the end of the paragraph as a plain rule: a client who has no linked psychologist can log in, edit own profile and see an empty dashboard, but has no sessions.
- **M** (line 293) "клієнт автоматично від’єднується від сесії" after the psychologist ends it. In the code the server does not close the socket. The client page polls every 5 seconds (`client/live-appointment.tsx:149–165`) and opens a dialog when the status becomes `past`. Describe it as "клієнт дізнається про завершення не пізніше ніж за 5 секунд".

## 2.2 Користувацькі історії

- **H** (story 6, line 305) "Як користувач, я хочу отримувати нагадування про майбутні сесії та рекомендації". Recommendation reminders go only to the client (FR 17, line 961; code `findRecReminderCandidates` returns `a.client_id`). Split into two stories: user → session reminders; client → recommendation reminders.
- **M** (story 4, line 303) "приєднуватися до запланованих сесій". A planned session cannot be joined until the psychologist starts it (see 1.4). Use "активних сесій".
- **M** The list has no story for: starting/ending a session, the psychologist dashboard (FR 18), the client dashboard (FR 20), editing/deleting notes and recommendations, deleting a pending invitation (`DELETE /api/invitations/:id`), viewing the board snapshot. The conclusion (line 489) says "20 користувацьких історій"; update the count after additions.

## 2.3 Аналіз вимог

- **H** (observations 1–2, lines 328–329; and 2.5 line 350) The text says only the psychologist can place associative images on the board, and that the server checks roles so that "їх неможливо обійти зміною коду в браузері". The code enforces this only in the UI (`WhiteboardImageInsert` is rendered only on the psychologist page). The WebSocket handler accepts `files` and `elements` messages from any participant (`whiteboard/routes.ts`, `onMessage`). Choose one:
  - state that the restriction is a UI rule and the server checks only session membership; or
  - add a role check to the WebSocket handler (a code change).
  The same applies to FR 6 (line 945: "Завантаження … доступне лише психологу") and to appendix Л row 6.
- **M** (line 324) "нагадування про рекомендацію може отримати лише тоді, коли рекомендацію не позначено як виконану". The code sends it only if (a) the client has a later session in the 2-day or 1-day window and (b) an earlier recommendation from the same psychologist is not done (`notifications/repo.ts`, `findRecReminderCandidates`). Rewrite with both conditions.
- **L** (line 332) "фото" vs "зображення" elsewhere. Use one word.

## 2.4 Вимоги

- **M** (NFR 1, line 338) "до 100 мс" is not measured or tested anywhere. Either add a measurement (for example round-trip of a broadcast on localhost) or write it as a design target. Section 3.5 (line 872) says the system meets the non-functional requirements; no test covers NFR 1, 3, 5 or 6.
- **H** (NFR 5, line 342 vs 3.2, line 524) NFR 5 is named "Масштабованість". Section 3.2 says the system must run as one instance (in-process scheduler, local file store). Rename NFR 5 to "Ізоляція даних психологів" (what the text really describes) and state the single-instance limit as a known limitation.
- **L** (line 489) "product backlog" appears only in the chapter conclusions. Name it in 2.4 or drop it.

## 2.5 Попереднє архітектурне проєктування

- **M** (point 1, line 349) "періодично зберігає його в базі даних". The code saves after 3 seconds without changes (debounce) and on closing the last connection; 2.6.1 and 3.3.1.1 say so. Replace "періодично" with "після короткої паузи в змінах".
- **H** (point 2, line 350) The claim about server-side role checks contradicts the whiteboard channel. See 2.3.
- **H** (conclusions, line 490) "клієнт–сервер із тонким клієнтом". Nothing in 2.5 says "тонкий клієнт". Section 2.5.2 and chapter 3 describe a single-page application with a drawing library, local buffering and cursor throttling. Remove "тонким" or justify it.

## 2.5.1 Серверна частина

- **H** (package 10, line 374; also 2.6.4 and 3.3.2) The code sends a fourth e-mail type, `rec_created` ("Ваш психолог додав нову рекомендацію"), when a psychologist creates a recommendation (`attachments/services.ts:71` calls `NotificationsService.enqueueRecCreated`; template in `notifications/templates.ts`). The paper never mentions it, not in 2.5.1, 2.6.4, 3.3.2, FR 17 or appendix Л row 17. Add it, or remove the feature.
- **L** (package 1, line 365) "система не зберігає паролів". Table 3.3 (line 624) lists the column `password` of `account`. Add "(колонка створена Better Auth і не використовується)".

## 2.5.2 Клієнтська частина

- **M** (lines 382–391) The eight packages omit pages that exist in the code and in 3.4: client list, client profile (psychologist), "Мій профіль" (client), and the invitation-accept page `/invite`. Add them or state which package contains them.
- **M** (line 393) "Клієнт не звертається … до зовнішніх сервісів". The browser is redirected to Google during sign-in and opens Google Meet links. Say "не викликає API зовнішніх сервісів напряму".
- **L** (lines 393, 482) "запити статичних даних" is a misleading name for REST request–response calls (they carry live data). Use "запити REST API" or "запит–відповідь".

## 2.6.1 Проведення сесії

- **H** (line 408) "сервер зберігає стан і вивантажує кімнату з оперативної пам’яті і бази даних". The code (`whiteboard/routes.ts:192–200`) saves pending state and removes the room from memory only. Nothing is removed from the database. Fix: "…з оперативної пам’яті".
- **H** (not mentioned; 2.6.5 line 463; table 3.8) When the psychologist ends the session, the server clears `whiteboard_elements` and `whiteboard_files` (`appointments/services.ts:198` → `WhiteboardRepo.clearState`). Only the PNG snapshot remains. The paper presents the board state as a persistent attribute of the session. State that the editable board is deleted at the end and the snapshot is the final record. This also affects FR 13 (line 957).
- **M** (goal, line 406; FR 13) "стійкості до розривів зв’язку" and "відновити стан дошки". The client hook does not reconnect by itself (`useWhiteboardSync.ts`, `ws.onclose` only sets `connected=false`). Recovery happens when the user reopens the page. Say so.
- **L** (line 407) The text says the server first checks "що сама сесія є активною". Add one sentence: this requires an explicit start by the psychologist (see 1.4).

## 2.6.2 Планування сесій

- **M** (not mentioned) Rules in the code that the section should state:
  - only an `upcoming` session can be edited or deleted (`AppointmentNotEditable`, `AppointmentNotDeletable`);
  - only `upcoming` or `warning` sessions can be started;
  - overlap checks and writes use per-user advisory locks (`acquireOverlapLocks`).
- **H** (lines 425, 340–341) The paper says Google integration is non-blocking and "покращує відмовостійкість". This holds for **creation** and **deletion**. For **editing with "reschedule Google Meet"** the opposite policy applies: if the Calendar update fails, the whole edit is rejected with HTTP 502 `MeetRescheduleFailed` (`appointments/services.ts` around line 311). Document both policies and the reason (avoid a calendar that disagrees with the database).
- **M** (lines 265, 305, 451 and others) "скасування/скасована" suggests a cancelled status. There is none. Cancelling is a hard `DELETE` of the row (`AppointmentsRepo.deleteById`), and related `email_outbox` rows disappear by `ON DELETE CASCADE`. Use "видалення" or explain.

## 2.6.3 Вкладення

- **H** (line 437 vs lines 946, 947, 959) 2.6.3 says attachments can be created "для будь-якої сесії, крім майбутньої". FR 7, 8 and 15 say "лише для активної або завершеної сесії". The code blocks only `upcoming` (`attachments/services.ts:101, 125`), so sessions in status `warning` and `missed` also accept attachments. Use the rule of 2.6.3 in all places, and name the statuses.
- **M** (line 441) "усі … мають схожі операції (створення, перегляд, редагування, видалення)". A client cannot edit an impression: there is no update route in `attachments/client-routes.ts`. The client can only add one response (`PATCH …/complete`). Rewrite, or say that editing applies to notes and recommendations.
- **H** (FR 16, line 960) "Реакція є одноразовою". In the code only the comment is write-once (`CommentAlreadySet`, `attachments/services.ts:240`). The `done` flag can change many times (the test "toggling done" in `reactions-routes.test.ts`). Write: "коментар можна залишити один раз; позначку виконання можна змінювати".
- **L** Side finding in the code, not in the paper. `AttachmentsRepo.upsertReaction` (`attachments/repo.ts:294–311`) inserts `done = false` when only a comment is sent, and the conflict branch uses `COALESCE(EXCLUDED.done, …)`, which is never null. A comment sent after the client marked the item done appears to reset `done` to false. No test covers this order. Verify before submission.

## 2.6.4 Надсилання сповіщень

- **M** (line 451) "сесія може розпочатися або бути скасованою … запис позначається непотрібним". A deleted session removes its queue rows (cascade), so they are never "skipped". Skipping happens for a started session or a non-pending invitation (`notifications/definitions.ts:25–26, 38`). Align the sentence.
- **M** (lines 451, 455) The text uses "непотрібним" and "недоставлений". The table and the code use four statuses: `pending`, `sent`, `failed`, `skipped`. Introduce these four names once (here or in 3.3.XX) and use them in the text. Also state the retry limit (`MAX_ATTEMPTS = 3`).
- **H** `rec_created` and `invitation_created` use the same queue; this section describes only reminders. See 2.5.1.

## 2.6.5 Концептуальна модель

- **M** (line 462) The entity "Користувач" holds name, e-mail, username, active role, phone, Telegram, Instagram. In the datalogical model (2.6.6, 3.3.XX) username, phone, Telegram and Instagram are in `clients`, and `psychologists` has no attributes. Add the entities Psychologist and Client to 2.6.5, or add one sentence explaining that the conceptual model merges them.
- **L** (line 464) "відповідь клієнта на запит враження після сесії": the phrase "запит враження" is never defined. Use "відповідь клієнта на власне враження". (This is correct for the code; table 3.13 is wrong, see 3.3.XX.)

## 2.6.6 Даталогічна модель

- **H** (line 472 vs line 578) 2.6.6 says the role profiles are separate because the `user` structure belongs to a third-party library and "розширювати її … небажано". Section 3.3.XX says the project adds the column `active_role` to that same table (migration `20260310092256_add-active-role-to-user.sql`). Reword the reason, for example: "контактні дані клієнта винесено окремо; роль зберігається в `active_role`, бо вона потрібна кожному запиту".
- **M** (lines 472, 641, table 3.5) `psychologists` has one column (`user_id`) and nothing references it; all foreign keys point to `user.id`. The reason given (roles have different attribute sets) holds only for `clients`. Explain what the table is for (a marker that the user may act as a psychologist, created by the trigger) or remove it.
- **H** (line 474) "Асоціативне зображення … звʼязком «один до одного» посилається на «Файл»". The schema has `file_id TEXT NOT NULL REFERENCES files(id)` without `UNIQUE` (`20260417120000_create-associative-images-table.sql:5`). It is many-to-one. Add `UNIQUE (file_id)`, or change the text.
- **H** (line 472, "Поштове сповіщення … кожне сповіщення має одного адресата") `email_outbox.recipient_user_id` is nullable. Invitation e-mails go to a raw address in `recipient_email` and there is no user (`20260720193800_extend-email-outbox-for-invitations.sql`; check `email_outbox_recipient_present`). Rewrite: "адресат – користувач або необов’язково сира адреса".
- **M** (line 473) The reasons for the junction table are muddled: "тому що файл може належати іншій сутності". The real reasons: one attachment has several files, and the link carries `file_type` and `position`. Rewrite.

## 2.7 Уточнена архітектура

- **H** (line 482 vs line 511) "API-клієнт, через який проходять усі запити клієнтської частини". The same paragraph says the board uses a separate real-time channel. In the code the WebSocket is opened directly (`new WebSocket` in `useWhiteboardSync.ts`) and sign-in uses the Better Auth client (`services/auth.service.ts`), not Axios. Write "усі REST-запити". Same fix in 3.2 (line 511: "усі вихідні запити").
- **H** (line 482 vs line 483) Role control is assigned to two components: "Інтерфейс статичних даних … контроль доступу за ролями" and "Auth Service … перевірку ролей". The code has no `Auth Service` module. Roles are checked by Hono middleware (`middlewares/auth.ts`: `setUserRole`, `onlyPsychoRequest`, `onlyClientRequest`, `onlyLinkedClient`) from the header `Helpsycho-User-Role` and the stored `user.active_role`. This header mechanism is not described anywhere in the paper. Add a short description and assign the check to one component.
- **M** (lines 483–485 vs 3.2 vs 3.3) Component names differ between sections and from the code:

  | Paper (2.7/3.2) | Code |
  |---|---|
  | Session Service | `AppointmentsService` (named so in 3.3.1.1) |
  | Client Service | `ClientsService` (3.3.3) |
  | Invitation Service | `InvitationsService` (3.3.3) |
  | Notification Service | `NotificationsService` (3.3.2) |
  | File Storage Service | `FilesService` |
  | Realtime Connection Gateway (2.7) / Whiteboard WebSocket-шлюз (3.2) | `whiteboardRoutes` (`WhiteboardRoutes` in 3.3.1.1) |
  | Auth Service | no module (Better Auth + middleware) |

  Add a mapping table "компонент у проєктуванні → модуль у коді", or use one set of names.

## Висновки до розділу 2

- **H** "із тонким клієнтом". See 2.5.
- **L** "відновленням після розриву звʼязку" — see 2.6.1 (no automatic reconnect).

## 3.1 Вибір мови та середовища

- **M** (line 503) Better Auth "гарантує наявність облікових записів Google для створення Google Meet". The code uses only the **psychologist's** tokens to create the event (`utils/google-meet.ts`, `generateGoogleMeetLink(psychoId, …)`); the client e-mail is only an invited attendee. If the psychologist did not grant the calendar scope, the link is not created (null, with a warning). Replace "гарантує" with "дає змогу".
- **L** (line 501) React Router is credited with "завантаження даних". The application does not use route loaders (only `well-known.tsx` has one); data is loaded in components through service modules. Remove, or say "підтримує".
- **L** (frontend) The paper does not name Vitest/Testing Library (`frontend/package.json`), Axios (named only in 3.2), Zod, react-hook-form or TanStack Table. Add Vitest at least (see 3.5).

## 3.2 Структурна схема

- **H** (line 522) "Better Auth – автентифікація та перевірка ролей" (line 518). Better Auth does not check roles; the project middleware does (see 2.7).
- **M** (line 524) The single-instance reasons miss the main one: the room registry (`rooms`, `saveTimers`) lives in process memory (`whiteboard/routes.ts:28–29`). Two instances would split one session into two rooms. Add it.
- **M** (line 524) "запуск декількох копій … спричинив би дублювання листів". Duplicate queue **rows** are blocked by the unique index. Duplicate **sends** are the risk: `claimPending` selects rows without locking (`notifications/repo.ts`), so two processes could send the same row. Make the text say this.
- **M** (line 522) "Better Auth наразі не підтримує вбудований у Bun PostgreSQL-клієнт". This is an unsourced, time-dependent claim. Cite the Better Auth documentation or write "використовує драйвер node-postgres".
- **M** (lines 522, 2.5.1 line 377) The paper says files are stored on disk and that the file store holds associative images and attachments. The board snapshot is neither: it is a base64 PNG data URL (up to 2 MB) stored in `appointments.whiteboard_snapshot_url` (limit in `appointments/routes.ts`, schema `endAppointmentSchema`, field `snapshotDataUrl`). The column name suggests a URL. Add one sentence; it explains table 3.8.

## 3.3 Розробка компонентів (structure)

- **H** The section describes only the board (3.3.1), notifications (3.3.2), invitations/clients (3.3.3) and the database. The designed packages "Планування сесій" (2.6.2), "Керування вкладеннями" (2.6.3), "Керування асоціативними зображеннями", files, dashboards, progress and the auth/role middleware have no implementation text. Either add sections or write in 3.3's intro why these are omitted.

## 3.3.1.1 Серверна частина дошки

- **H** (lines 534–536) Names that do not exist in the code, while the text says "У коді модулі пакета є об’єктами TypeScript":
  - `RoomRegistry` — the `rooms`, `saveTimers`, `broadcast`, `scheduleSave` and `flushPendingSave` are module-level constants and functions in `whiteboard/routes.ts`, not an object;
  - `authenticate(headers)` — the route calls `auth.api.getSession` inline;
  - `upgradeWebSocket(appointmentId)` — it is the Hono helper that takes a handler function.
  Say that the diagram groups these functions into logical classes, or rename to match the code.
- **H** (line 535) "`getForParticipant` … перевіряє, що користувач є учасником сесії і що сесія має статус «active»". The method only returns the appointment if the user is a participant (`appointments/repo.ts`, `findByIdForParticipant`). The status check is in the route (`whiteboard/routes.ts:121`). Fix the text.
- **M** (line 535) Close reasons: the code uses 1008 for "no session", "not active", "not found", and 1011 for a failure while loading the room. Add 1011.
- **M** (lines 536–537) Add that `clearState` is called when the session ends (see 2.6.1).

## 3.3.1.2 Клієнтська частина дошки

- **H** (line 544) "`onWhiteboardChange` … надсилає серверу змінені елементи". The hook sends the **whole** element array on every change, and the server replaces the stored array (`room.state.elements = msg.elements`). Only new files are sent incrementally. Rewrite. Add a sentence on the consequence: with two editors, the last message wins and concurrent edits can overwrite each other (the version-based merge of Excalidraw is not used on the server).

## 3.3.2 Модуль сповіщень

- **H** (line 554) "Опис перечитує дані сесії і пропускає лист, якщо сесію перенесли або вона вже почалася". The check is `!appointmentStartTime || appointmentStartedAt` (`notifications/definitions.ts:25–26`). A moved session is **not** skipped; the e-mail is built with the **new** start time. Reword. (The code has a `TODO EDG-58` for a "rescheduled" e-mail, which does not exist.)
- **M** (lines 552–554) `NotificationsCron` does not exist; `cron.ts` exports `registerNotificationCrons()`. `EmailService` is the object `emailService`. Align the names.
- **M** (lines 553–556) Missing: the status `skipped`, the types `rec_created` and `invitation_created`, and their templates. Section 3.2 already mentions invitations in the queue; this section should list all four types.
- **L** The e-mail subjects use the product name "Helpsycho" (`templates.ts`). The paper never uses this name. Name the product in the introduction or use a neutral name in the e-mails.

## 3.3.3 Запрошення та керування користувачами

- **M** (not mentioned) Re-linking: `ClientsRepo.linkClientToPsycho` uses `ON CONFLICT … SET disconnected_at = NULL`, so an unlinked client can be linked again with the old history. The term "повторне залучення" appears first in table 3.18 (line 862) and appendix Л (line 1016) with no explanation. Add two sentences here and in FR 22.
- **L** (title) "керування користувачами" — the section covers the link between psychologists and **clients**. Rename.
- **L** (not mentioned) A psychologist can delete a pending invitation (`DELETE /api/invitations/:id`); no requirement lists it.

## 3.3.XX Реалізація бази даних

I compared tables 3.1–3.17 with the migrations and `psychodb_dump.sql`. Column names, types, `NOT NULL`, defaults, `UNIQUE`, primary keys and the stated foreign keys match. The count "17 таблиць: 13 доменних і 4 службових" is correct. The issues:

- **H** (line 746, table 3.13) "Таблиця «impression_completions» зберігає відповідь **психолога** на враження клієнта". The column is `client_response`; the route `PATCH …/attachments/:id/complete` is client-only (`attachments/client-routes.ts:105–121`) and 2.6.5 (line 464) says "відповідь клієнта". Correct line 746 and the sentence "не більше однієї відповіді на враження" accordingly.
- **M** (table 3.8, line 689) Note that `whiteboard_snapshot_url` holds a base64 data URL, not a URL (see 3.2).
- **M** (table 3.16, lines 782–801) Add the check constraint `email_outbox_recipient_present` (a user or an address must exist) and the allowed `status` values (`pending`, `sent`, `failed`, `skipped`) and `type` values (four types).
- **L** Most foreign keys use `ON DELETE CASCADE` (deleting a user removes all their data). Only table 3.15 states this. One sentence in the chapter intro would cover it.

## 3.4 Інтерфейс користувача

- **H** (lines 824, 818, 938, 958) The paper quotes Ukrainian interface texts: "Запланувати сесію", "лише сьогодні", tabs "Прогрес" and "Сесії", button "Приєднатися", option "створити Google Meet". The interface is in English ("Schedule Appointment", the checkbox "Show only appointments today", "Join Call", "Generate Google Meet link", sidebar "Appointments", "Clients"). I did not find the tab labels, so check "Прогрес" and "Сесії" yourself. Either translate the interface, or write the real labels in the paper.
- **M** (captions of figures 3.2–3.7) The captions say "Макет" (mock-up), but the section describes the implemented interface. If these are screenshots, use "Знімок екрана"; if they are design mock-ups, say that.
- **M** (3.4.1, FR 21 at line 970, 2.5.1 package 9) For the psychologist the progress tab shows only **impressions** (`GET /api/clients/:clientId/progress/impressions`, `routes/psychologist/client-progress.tsx`). FR 21 says "вражень і рекомендацій", "Доступний клієнту та психологу". The client's timeline contains both. State the difference.
- Verified, no issue: five psychologist menu items and four client menu items (`useSidebarItems.ts`); status names; the three counters; "останні клієнти"; the 5 s polling; the follow-up dialog condition; the psychologist selector on the client progress page (automatic choice when there is one psychologist).

## 3.5 Тестування

- **H** (line 853) "Функціональне тестування клієнтської частини виконувалося вручну". The repository has 33 Vitest files with about 222 test cases (`frontend/app/test/*.test.tsx`). Describe them (and add a table) or explain that they are not part of the thesis evidence.
- **H** (line 871) "замінюються лише виклики зовнішніх сервісів (Google Calendar API, … Brevo)". The tests use no mocks. Google calls return `null` because the test database has no Google account (`utils/google-meet.ts`), and e-mail is logged instead of sent because `EMAIL_ENABLED` is not `true` (`notifications/email-service.ts`). Reword: "виклики зовнішніх сервісів вимкнено конфігурацією".
- **H** (appendix Л row 14, line 1030) "перевіряється лише коректне формування запиту". No test builds or inspects a Calendar request. Only the failure path is covered. Change to "перевіряється стійкість до недоступності сервісу".
- **H** (appendix Л row 1, line 1012) "Інтеграційними тестами підтверджено, що доступ до дошки … відхиляється (коди 401/403)". There is no whiteboard test (3.5 itself says the WebSocket was tested by hand), and the socket closes with code 1008, not HTTP 401/403. Change to "перевірено вручну; сервер закриває з’єднання з кодом 1008".
- **M** (line 872) "відповідає … нефункціональним вимогам". NFR 1 (latency), 3 (responsive layout), 5 and 6 (browsers) have no test or measurement in the paper. Soften, or add evidence.
- **M** (table 3.18, "15 з 18 наборів") The counts per domain and the total 415 match the code (94, 128, 39, 39, 23, 26, 29, 15, 16, 6). There are 18 test files. By a search for 401/403/404 assertions, 16 files contain access checks (the two without them are `files/upload-validation.test.ts` and `notifications/services.test.ts`). The row "Файли" is marked "так", yet one of its two files has no access test. Define what "набір" means and recount.
- **L** (line 871) "спочатку застосовуються всі міграції": the Better Auth tables must already exist from a one-time manual step (comment in `test-setup.ts`). Mention it as a precondition.

## Висновки до третього розділу / ВИСНОВКИ (lines 876, 880)

- **H** Both contain only the placeholder `ЖЖ`. Write them. The general conclusions should answer tasks 1–6 of the introduction (lines 148–153) one by one and report the results (23 requirements, 17 tables, 415 tests).

## Список використаних джерел

- **M** (source 9, line 892) A health-department news page is used as the definition of "асоціативні карти". Replace with a psychology reference, or keep it only as an example.
- **L** (source 22, line 905) The URL is the documentation of a paid add-on (`plus.excalidraw.com`). The library used is `@excalidraw/excalidraw` (`frontend/package.json`). Cite the library documentation.
- **L** TypeScript, Axios, node-postgres and `googleapis` are mentioned (3.1, 3.2) without a source.

## Додаток Г (functional requirements)

- **H** (lines 935, 938 vs 957) Requirements 1 and 4 say the board is available "лише тим … які мають доступ до відповідної сесії". Requirement 13 says "Доступна всім зареєстрованим користувачам". Requirement 9 (line 948) also says "всім". Use "учасникам відповідної сесії" for 13, and "автору вкладення (психолог – нотатки і рекомендації, клієнт – враження)" for 9.
- **H** FR 7, 8, 15: "лише для активної або завершеної сесії" — see 2.6.3.
- **H** FR 16: "Реакція є одноразовою" — see 2.6.3.
- **M** FR 17 (line 961): add the second reminder timing for recommendations (2 days and 1 day), and the `rec_created` e-mail; "за 1 день" means 24 hours.
- **M** FR 22 (line 971) "Історія сесій … зберігається". After unlinking, the psychologist cannot read the history through the application: `ensureLinked` rejects the client, and the lists filter on `disconnected_at IS NULL`. The data stays in the database and returns after re-linking. State this.
- **M** FR 21 — see 3.4.
- **L** (lines 937, 1014; 939, 1016) The names of FR 3 and FR 5 differ from the names in appendix Л ("…із генерацією посилання на Google Meet", "…через запрошення"). Use the same names.

## Додаток Л (test results)

- **H** Rows 1 and 14 — see 3.5.
- **L** Row 23 (line 1041) says the client fills the contacts. The API still has a psychologist route `PUT /api/clients/:clientId` that edits a client profile (marked `TODO: Ignore and delete` in `clients/routes.ts`). Remove the route before submission, or the claim "A psychologist must not edit a client's profile" is untrue for the API.

---

## What I checked and found correct (no action)

- Counts: 10 server packages (2.5.1), 8 browser packages (2.5.2), 20 user stories, 23 FR, 6 NFR, 17 tables.
- Board: save delay 3000 ms (`SAVE_DEBOUNCE_MS`), cursor limit 50 ms, close code 1008, path `/api/whiteboard/{appointmentId}`, empty-array guard, signature echo guard, buffering of the first scene.
- Session creation: the four checks and their order; Meet failure does not block creation; computed status with five values.
- Attachments: limits 15/10/10; delete rules for reacted recommendations and completed impressions; "one reply only"; "one comment only".
- Notifications: cron every 10 min (decision) and every 1 min (sender); bands 24h/1h and 2d/1d that do not overlap; both parties get session reminders; only the client gets recommendation reminders; stale check before send; retry limit; unique index `email_outbox_dedup`; partial index on `pending`; Kyiv time zone; subjects of the two reminder e-mails.
- Invitations: normalisation, the order of both checks lists (create: self, already linked, existing pending; accept: five checks in the order given), the transaction with `markAccepted` and link; e-mail enqueued in the same transaction.
- Database: the trigger function `ensure_user_role_rows` is the only stored function; self-link checks on `psychologist_clients` and `appointments`; composite primary key.
- Test counts in table 3.18 (per domain and total).
- Navigation and dashboard descriptions in 3.4.
