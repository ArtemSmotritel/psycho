# Substantive issues in paper.md (contradictions, code mismatches, gaps)

Source: full re-read of `paper.md` (980 lines) and checks against the code in `backend/` and `frontend/`. Line numbers (l.) refer to the current `paper.md`. Search for the quoted text, because the lines shift.

Easy fixes (typos, terms, quotes, apostrophes) are in `docs/paper-fixes-quick.md`. This file holds everything else.

Tags
- [CODE] the paper contradicts the code. The code is authoritative, so the paper changes (or the code, if you decide the code is wrong).
- [INNER] two places in the paper contradict each other.
- [GAP] something required or promised is missing.
- [CLAIM] a statement has no evidence in the paper or in the code.
- (known) already listed in `docs/fixes-by-section-chapters-1-2.md`. Listed here in short so nothing is lost.
- DECISION: the fix needs a choice from you. A recommended choice is given.

What I did not do: I did not run the test suite. The numbers in section 3.5 match the number of test cases I counted in the code (see "Verified correct" at the end), not a fresh run.

---

## Priority list (the ten items most likely to be noticed by a reviewer)

1. [CODE] The statuses of a session: four (2.6.5) against five (l.773 and the code).
2. [CODE] Impression «completion»: the paper says «відповідь на запит враження» (2.6.5) and «відповідь клієнта на враження психолога» (l.695). The code lets only the client add one note to the client's own impression.
3. [CODE] «Клієнти можуть створювати та редагувати враження» (l.424). The client cannot edit an impression.
4. [CODE] Reminder that is already queued is not cancelled when the client marks the recommendation done (l.441).
5. [CODE] The overlap check covers the client too, not only the psychologist (l.413, Додаток Г row 3).
6. [CODE] The whiteboard WebSocket route has no tests, yet l.820 says the tests cover all domains and Додаток ЖЖ rows 1, 4 and 13 cite integration tests.
7. [INNER] User attributes (2.6.5) against profile entities (2.6.6, 3.3) – postponed decision B-8.
8. [INNER] Appendix letters and references: Е/Д/Ж/ЖЖ are wrong in 3.2, 3.4 and 3.5; ЖЖ is not a valid letter; the table of contents lists other appendices.
9. [GAP] Chapter 3 has `todo`, `3.3.XX`, five image placeholders, 17 empty citations, and «ЖЖ» in place of two conclusions.
10. [INNER] 2.5 no longer defines the «thin client», but the conclusion of chapter 2 still names it.

---

## ЗМІСТ (l.35–123)

1. [INNER] The appendix list in the table of contents has 5 entries (А–Д) with other names. The body has А–Ж and ЖЖ (8 entries):
   - ЗМІСТ: «А – USE CASE … ПСИХОЛОГ», «Б – … КЛІЄНТ», «В – ФУНКЦІОНАЛЬНІ ВИМОГИ», «Г – ДІАГРАМА ДІЯЛЬНОСТІ …», «Д – ТАБЛИЦЯ РЕЗУЛЬТАТІВ …»;
   - body: А – бізнес-процеси, Б – психолог, В – клієнт, Г – функціональні вимоги, Д – діаграма діяльності, Е – структурна схема, Ж – схема переходів, ЖЖ – результати тестування.
2. [GAP] The table of contents has «3.xxx», «3.x.xxх» entries and has no 3.3 and no 3.3.XX. The body numbers are 3.3, 3.3.XX, 3.4, 3.4.1, 3.4.2, 3.5.
3. Fix: rebuild the table of contents after the last edit (headings, appendices, page numbers).

## СКОРОЧЕННЯ ТА УМОВНІ ПОЗНАЧЕННЯ

No substantive issue. See the quick-fix file for the missing abbreviations.

## ВСТУП (l.131–148)

1. [CLAIM] l.133: «Пандемія COVID-19, російсько-українська війна та інші глобальні зміни прискорили перехід…» has no source. Add a source or remove the claim. (known)
2. [GAP] l.134: the actuality paragraph is one sentence. `requirements.md` asks for a short summary of 1.1. (known)
3. [INNER] The product has five names: «система» (l.133, title page), «вебсервіс» (l.135, l.146), «програмний комплекс» (l.142, l.143), «сервіс» (section titles), «застосунок» (l.265). DECISION: pick one main term. Recommended: «вебсервіс» in the text and keep «система»/«сервіс» only inside the fixed section titles.
4. [GAP] l.148: three «ХХХ» placeholders (figures, sources, appendices).

## 1.1 Актуальність розробки та аналіз проблем (l.152–165)

1. [CLAIM] l.155: «підвищеного когнітивного навантаження» has no source.
2. [CLAIM] l.156: «повертаються після тривалих перерв (6–12 місяців)» has no source. The only citation [3] stands at the end of l.157.
3. [INNER] The sources [1] and [2] are cited only in the list of abbreviations. That is acceptable, but the bibliography has 8 sources, all websites, all with the access date 24.04.2025. (known)

## 1.2 Огляд та аналіз наявних систем (l.167–169) and 1.2.1–1.2.3

1. [CLAIM] Both analysed systems are US products (HIPAA, insurance). Add one sentence on why this matters (or not) for your users. (known)
2. [INNER] l.236 (Table 1.1) lists «Електронна медична картка» as an advantage of TheraPlatform. Section 1.2.1 does not mention ЕМК for TheraPlatform (only SimplePractice, l.193). Fix: remove «Електронна медична картка» from the TheraPlatform row, or add it to the advantages in 1.2.1.
3. [INNER] l.188 says «клієнти не можуть переглядати власний прогрес» for TheraPlatform, but Table 1.1 omits this disadvantage. Add it, because it is the main differentiator of your system (problem 5 in 1.1).

## 1.2.4 Аналіз переваг і недоліків (l.228–238)

1. Table 1.1 compares three rows in free text. Replace it with a feature matrix (video, schedule, notes, board, recommendations, client progress, reminders, price) and a column for your system. (known)

## 1.3 Огляд технологій (l.242–246)

1. [INNER] The heading says «технологій», but the text compares web, mobile and desktop. DECISION (known): rename to «Вибір типу застосунку…» and keep technologies in chapter 3.
2. [INNER] l.244 says the web app works «з будь-якого пристрою». l.245 and the non-functional requirement 3 (l.330) name only computers and tablets. Choose one scope.
3. [CLAIM] l.245: «Вебсервіс повністю задовольняє ці умови» and «що є критично важливим для зручності користування та масштабованості» are bare claims.
4. [CLAIM] The section has no citations. (known)

## 1.4 Постановка завдання (l.248–265)

2. [GAP] The 11 requirements omit functions that appear in the later chapters:
   - the client's reaction to a recommendation and the psychologist's reply (Додаток Г rows 16 and 19);
   - the client's contact data (row 23);
   - direct addition of a registered client (2.3).
   Add them to item 7, item 8, item 9, or add new items.
3. [CLAIM] l.265: «Це зменшить час психолога на організацію роботи, підвищить залученість клієнта…» is a promise with no evidence. Rewrite as a goal: «Це має зменшити час…».

## Висновки до першого розділу (l.267–269)

1. [GAP] The conclusion does not mention the task statement or the tasks. (known)

## 2.1 Моделювання бізнес-процесів (l.273–284)

4. (known) The text names no explicit interests per actor, and the three processes are not named by their goal.
5. [INNER] l.282 says the psychologist «додає його до списку» (direct addition) and also «надсилає запрошення». Додаток Г has no row for the direct addition (see Додаток Г).

## 2.2 Формування користувацьких історій (l.286–309)

3. (known) DECISION: a story about the client's progress for the psychologist (story 20 is for the client only; row 21 of Додаток Г serves both roles).
4. (known) No story has an acceptance condition; INVEST and a source for user stories are missing.

## 2.3 Аналіз вимог (l.311–322)

## 2.4 Функціональні та нефункціональні вимоги (l.324–333)

## 2.5 Попереднє архітектурне проєктування (l.335–348)

1. [INNER] 2.5 no longer describes the «тонкий клієнт». The conclusion of chapter 2 (l.480) still says «із тонким клієнтом». Add back the sentence that defines the term. Suggested: «Клієнтська частина реалізує архітектуру «тонкого клієнта»: фронтенд відображає інтерфейси користувача та обробляє дії користувача, а під час сесій постійно надсилає події на сервер і отримує від нього оновлення; бізнес-правила, перевірка доступу та збереження даних виконуються на сервері.»
2. [GAP] No coverage analysis (`requirements.md`): the text does not map the 23 requirements to the packages. The draft is in `docs/sections/2.5-arkhitektura-vymohy-ta-pakety.md`.
3. [GAP] No sources for the client–server pattern, SOA, MVC, MVP and MVVM.

## 2.5.1 Серверна частина (l.350–367)

1. [GAP] Item 10 says the package sends «листів-нагадувань про заплановані сесії та рекомендації». The code also sends two other emails through the same queue: `rec_created` (to the client, when the psychologist creates a recommendation) and `invitation_created`. The first is in no requirement and no section. Add `rec_created` to item 10 and to Додаток Г row 17, or note that it is out of scope.

## 2.5.2 Клієнтська частина (l.369–383)

1. (known) The client side has no package for the client list, the client profile, the disconnect function and the contact data (Додаток Г rows 18, 22, 23). DECISION: add a package «Керування клієнтами» (recommended), then update «восьми» (l.372) and the package diagram (рисунок 2.2).

## 2.6 Детальне проєктування (l.385–392)

1. (known) Add one paragraph that states why only four packages are detailed, or add the invitation package. A diagram and a text for the invitation already exist: `docs/diagrams/invitation-sequence.puml` and `docs/sections/2.6.x-dodavannia-klientiv.md`. If you add that section, renumber 2.6.5 and 2.6.6, and fix the list in l.389–392.

## 2.6.1 Проведення сесії (l.394–398)

## 2.6.2 Планування сесій (l.400–415)

## 2.6.3 Керування вкладеннями (l.417–431)

1. [CODE] l.424: «клієнти можуть створювати та редагувати враження». The client has no route to edit an impression. The client routes are: create (`POST`), `PATCH …/reaction` (recommendation), `PATCH …/complete` (one-time addition to an impression), `DELETE`. Fix: «клієнти можуть створювати враження та один раз доповнювати власне враження, а також відповідати на рекомендації.» (known B-9, but the text is still in the paper.)
2. [INNER] l.424: «Спільні дії, зокрема перегляд матеріалів сесії, доступні обом ролям.» The client has no access to the psychologist's notes (l.319, Додаток Г row 7; the code `listForClientView` returns only impressions and recommendations). Fix: «Спільні дії, зокрема перегляд рекомендацій та вражень, доступні обом ролям.»
3. [CODE] l.427 (item 1) and Додаток Г rows 7, 8, 15: «Вкладення можна створювати лише для активної або завершеної сесії». The code (`createForPsychoView`, `createForClientView`) rejects only sessions with the status «upcoming». It also allows sessions with the status «warning» (start time passed, session not started) and «missed». DECISION: change the paper to «для будь-якої сесії, крім майбутньої» (matches the code), or change the code to allow only «active» and «past». Recommended: change the paper, because it is shorter.
4. [CODE] Додаток Г row 16: «Реакція є одноразовою». In the code only the comment is one-time (`CommentAlreadySet`). The flag «виконано» can change again (`upsertReaction` with `done`). Fix: «Коментар клієнта є одноразовим; позначку виконання можна змінювати.»
5. [CODE] l.428 (item 2): «враження, яке вже має відповідь, видалити не можна» – the code blocks deletion of an impression that has a completion (`ImpressionHasCompletion`), so the rule is right. The wording «відповідь» is not (B-9). Use «враження, до якого клієнт уже дописав доповнення». Apply the same wording in 2.6.5, 2.6.6, 3.3 and Додаток Г row 15. (known)
6. (known) The attachments table of rights (author, visibility, edit, delete) is missing; the reason for 15, 10, 10 is not stated.

## 2.6.4 Надсилання сповіщень (l.433–445)

1. [CODE] l.441: the sender «повторно перевіряє подію» and skips the reminder if «рекомендація може отримати позначку «виконано»». The code (`DEFINITIONS` in `notifications/definitions.ts`) marks a reminder as stale only when the session has started or was deleted (`appointmentGone`). A recommendation that becomes «done» after the reminder is queued does not make the reminder stale. The «done» check runs only in the decision step (`findRecReminderCandidates`). Fix, option A (paper): remove «а рекомендація може отримати позначку «виконано»» from l.441. Option B (code): add a `done` check to `isStale` for `rec_reminder`. Recommended: option A now, and note option B as a future change.
2. [GAP] The section describes reminders only. The same queue also sends `rec_created` and `invitation_created` (2.7 mentions the invitation). Add one sentence that the queue serves four email types.
3. (known) Add numbers: decision step every 10 minutes, sender every minute, session reminders 24 h and 1 h, recommendation reminders 2 days and 1 day, maximum 3 attempts. Explain «ідемпотентний», because the conclusion of chapter 2 uses the word.

## 2.6.5 Концептуальна модель бази даних (l.447–455)

5. [CODE] l.454: «Сутність «Виконання враження» (ImpressionCompletion) зберігає відповідь клієнта на запит враження після сесії». No request for an impression exists in the code. The code stores one text that the client adds to the client's own impression (`impression_completions.client_response`). Fix: «зберігає одноразове доповнення, яке клієнт дописує до власного враження.» (known B-9)
6. [GAP] l.455: the conceptual entity «Поштове сповіщення» has no link to «Запрошення» and has no raw recipient email. The code has `invitation_id` and `recipient_email` for invitation emails. Add both.
7. (known) l.450–451: the caption says «Інфологічна», the heading says «Концептуальна» (see the quick-fix file).

## 2.6.6 Даталогічна модель бази даних (l.457–464)

1. [CODE] l.462: «кожне сповіщення має одного адресата» as a many-to-one link to «Користувач». The column `email_outbox.recipient_user_id` is optional. Invitation emails have only `recipient_email`. Fix: «кожне сповіщення має адресата: користувача або, для запрошень, електронну адресу».
5. (known) B-8 – say in one sentence that `PsychologistClient` and `Appointment` link to `User`, while profile entities also exist.

## 2.7 Уточнена архітектура (l.466–475)

## Висновки до другого розділу (l.477–480)

## 3.1 Вибір мови та середовища програмування (l.484–496)

1. [GAP] 17 empty citations `\[\]` (TypeScript, Bun, Hono, PostgreSQL, Bun SQL, React, React Router, Tailwind CSS, Better Auth, Google OAuth, WebSocket, Excalidraw, Google Calendar API, Brevo, Zed…) and one `\[17\]` (l.492, shadcn). The bibliography has 8 entries. Add the sources and number them.

## 3.2 Структурна схема реалізації (l.498–514)

1. [CLAIM] l.512: «Better Auth наразі не підтримує вбудований у Bun PostgreSQL-клієнт». Not checkable in the repository: `utils/auth.ts` only shows that Better Auth gets a `pg` `Pool`. Add a source or soften: «Better Auth налаштовано з драйвером node-postgres».

## 3.3 Розробка компонентів / 3.3.XX Реалізація бази даних (l.516–759)

1. [GAP] l.518: `*todo*`. l.520: the number `3.3.XX`. l.524: «\[Місце для зображення: фізична модель бази даних\]».
2. [CODE] l.695: «Таблиця «impression_completions» зберігає відповідь клієнта на враження психолога». The impression is written by the client (`attachments.type = 'impression'`, author is the client), and the completion is the client's own addition (`completeImpressionForClientView` requires `setExpectedAuthor('self')`). Fix: «зберігає одноразове доповнення, яке клієнт дописує до власного враження. Первинний ключ attachment_id гарантує не більше одного доповнення на враження.» Rename the column description in Таблиця 3.13 if needed (`client_response` stays).
3. [CODE] Таблиця 3.8: the column `whiteboard_snapshot_url` holds a data URL (see 2.6.5, item 3). Add the remark to the text of l.621.
4. [CLAIM] Tables 3.1–3.4 (`user`, `session`, `account`, `verification`) cannot be checked against the repository migrations. Better Auth creates them outside the migration folder (the comment in `test-setup.ts`: «better-auth tables must already exist from the one-time manual setup step»). The column names `accessToken`, `refreshToken`, `accessTokenExpiresAt`, `scope`, `userId`, `providerId` are used in `utils/google-meet.ts` and match Таблиця 3.3. Check the rest with `\d "user"` in your database before you submit.

## 3.4 Реалізація інтерфейсу користувача (l.761–798)

1. [GAP] Four image placeholders: l.780, l.785, l.792, l.797 («\[Місце для зображення: …\]»).
3. [CODE] The interface text in the screenshots will be in English («Schedule Appointment», «Show only appointments today», «Total Clients», «Upcoming Appointments», «Past Appointments», «Recent Clients», «My Psychologists», «Pending Recommendations»). The text in 3.4 quotes Ukrainian labels: кнопка «Запланувати сесію» (l.773), перемикач «лише сьогодні» (l.773). Fix: either translate the interface, or write the English labels in the text, or say «кнопка планування сесії» without quotes. The product uses «Appointment» in the interface and «сесія» in the paper. Add one sentence to 3.4 on the interface language.

## 3.5 Тестування (l.800–821)

3. [CODE] l.820 says the tests replace «Google Calendar API» and the mail service. The code does not replace the Google API in the tests: the test users have no Google account row, so the call returns no link and the session still gets created (this is exactly the behaviour of NFR 4). The mail service is replaced in one file (`spyOn(emailService, 'send')`), and in all others `EMAIL_ENABLED=false` makes the sender only log. Fix: «Виклики зовнішніх сервісів не виконуються: поштовий сервіс вимкнено налаштуванням, а запити до Google Calendar API завершуються відсутністю посилання, що перевіряє стійкість до збоїв.» Row 14 of Додаток ЖЖ («звернення … замінено, тому перевіряється лише коректне формування запиту») must change too, because no test checks the request format.

## Висновки до третього розділу (l.823–825), ВИСНОВКИ (l.827–829)

1. [GAP] Both contain only the text «ЖЖ». Write them. `docs/CLAUDE.md`: no approbation in ВИСНОВКИ.

## СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ (l.831–840)

1. [GAP] 8 sources, all websites, all with the access date 24.04.2025. Chapter 2 cites nothing. Chapter 3 needs about 17 more. (known)
2. [GAP] The numbers [9]–[16] and [18+] must be reserved for the chapter 2 and chapter 3 citations. Fix the numbering order by the order of first reference.

## Додатки – letters and references (l.842–980)

1. [INNER] The appendices in the body: А (бізнес-процеси), Б (психолог), В (клієнт), Г (вимоги), Д (діаграма діяльності), Е (структурна схема), Ж (схема переходів), ЖЖ (тести). The references in the text:
   - 2.1: «додаток А» ✓;
   - 2.3: «додаток Б» (психолог) ✓, «додаток В» (клієнт) ✓;
   - 2.4: «додаток Г» ✓;
   - 2.6.1: «додаток Д» ✓;
   - 3.2: «У додатку Д» ✗ (must be the structural scheme, Е);
   - 3.4.1: «додаток Е.1», 3.4.2: «додаток Е.2» ✗ (the appendix with the schemes is Ж);
   - 3.5: «у додатку Е» ✗ (the test table is ЖЖ).
2. [INNER] «ЖЖ» is not a valid letter (`requirements.md`: the letters Ґ, Є, З, І, Ї, Й, О, Ч, Ь are not used). The sequence А, Б, В, Г, Д, Е, Ж, [next] must continue with the next valid letter after Ж: И. DECISION: rename ЖЖ to И, and update l.821 and the table captions. This also changes the example in the quick-fix file («Таблиця Е.1» → «Таблиця И.1»). Also update the appendix table in `docs/CLAUDE.md` (it still lists И, К, Л, М, Н, П, Р for other diagrams).
3. [INNER] Додаток Ж has two labels («Е.1», «Е.2») that name the clients and the psychologist in the opposite order to the text of 3.4. Fix the labels: Ж.1 = психолог, Ж.2 = клієнт (as in 3.4.1 and 3.4.2).
4. [INNER] The appendices Д and Е contain only an image under a title. The title style is «ДОДАТОК Д – …» in capitals; the headings of Б and В use the word «АКТОРА»; keep one style.

## ДОДАТОК Г – Функціональні вимоги

1. [INNER] Row 5 «Додавання клієнтів психологом через запрошення»: add a row for the direct addition (see 2.3, item 1).
2. [CODE] Row 3 (overlap), rows 7, 8, 15 («лише для активної або завершеної»), row 16 («Реакція є одноразовою»): see 2.6.2 and 2.6.3.
3. [CODE] Row 15: «Враження, яке вже має відповідь, видалити не можна. Відповідь є одноразовою». Use the wording «доповнення». (known B-9)
4. [INNER] Row 13 uses «Від’єднатися й повторно приєднатися до сесії» for a network disconnect, and row 22 uses «Від’єднання клієнта від психолога» for ending the cooperation. One verb for two meanings. Fix row 13: «Розірвати з’єднання (закрити вкладку) й повторно приєднатися…».
6. [INNER] Rows 3 and 14 overlap (the Meet link and the Calendar event come from the same call). Merge or describe the difference. (known)
7. [GAP] Row 17 does not give the timing of the recommendation reminders (2 days and 1 day before the next session), and does not mention that the reminders about recommendations are tied to the next session. (known)

## ДОДАТОК ЖЖ – Результати тестування вимог

1. [CODE] Rows 1, 4, 13: see 3.5, item 2.
2. [CODE] Row 14: see 3.5, item 3.
3. [CODE] Row 15: «відповідь клієнта на запит враження (impression completion)». Replace with «одноразове доповнення клієнта до власного враження». (known B-9)
4. [INNER] If you add rows to Додаток Г (direct addition, edit and cancel of a session, status change), add the matching rows here.
5. [CLAIM] The rows say «Перевірено вручну» without a record. Keep a short list of what was checked by hand (date, browser), in case the supervisor asks.

---

## Verified correct (so you do not need to re-check them)

I compared these statements with the code and found no difference:
- Tick intervals: decision step every 10 minutes, sender every minute (`notifications/cron.ts`). Session reminders at 24 h and 1 h, recommendation reminders at 2 days and 1 day (`producers.ts`). Maximum 3 attempts, then `failed` (`MAX_ATTEMPTS = 3`). Unique index `email_outbox_dedup` and the partial index on `(status, scheduled_for)` for pending rows.
- Both client and psychologist get session reminders; only the client gets recommendation reminders.
- Whiteboard: access only for a signed-in participant of an active session; the server keeps one room per session in memory; deferred save after 3 seconds; the cursor message is only forwarded; the cursor interval of 50 ms is in the browser; the room is removed when the last participant leaves; only the psychologist ends the session; the snapshot comes from the client.
- Planning: the order of checks (schema, end after start, client linked, no overlap); Google Meet is requested after the session is saved and its failure does not cancel the session; the Meet link can be added by hand.
- Attachment limits 15 notes, 10 recommendations, 10 impressions per session. A recommendation with a client reaction cannot be deleted. A reply of the psychologist is one-time. The client's comment is one-time. The client's addition to an impression is one-time.
- Authentication only through Google (no password login); roles checked against `active_role` in the database.
- The database: 17 tables (13 domain, 4 service); the trigger `user_role_rows` and the function `ensure_user_role_rows`; the CHECK constraints against self-links; `ON DELETE CASCADE` on `associative_images.psychologist_id` and none on `file_id`; the dropped column `invitations.expires_at`; the columns of tables 3.5–3.17.
- Tests: 415 test cases; the numbers per domain in Table 3.18 are exact (94, 128, 39, 39, 23, 26, 29, 15, 16, 6); 18 test files, 15 of them contain checks for 401 or 403; the tests run sequentially (`--no-test-parallelism`); all tables are cleared before each test; migrations run before the suite.
