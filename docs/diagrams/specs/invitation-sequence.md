# Sequence diagram: invitation and client addition (new subsection of 2.6)

Scope: the flow "psychologist invites a client, the client accepts, the psychologist plans a session". Verified against `backend/src/features/invitations/`, `clients/`, `notifications/`, `appointments/services.ts`, `frontend/app/routes/invite.tsx` and `auth-callback.tsx`.

Draw as a UML sequence diagram. Title: «Діаграма послідовності створення та прийняття запрошення».

## 1. Participants (lifelines, left to right)

1. **Психолог** – actor. Works in the browser.
2. **Клієнт** – actor. Works in the browser. Becomes a client after step 22.
3. **Застосунок** – package «Створення запрошень» on the server (routes, service, repository drawn as one lifeline).
4. **База даних** – tables `invitations`, `email_outbox`, `psychologist_clients`.
5. **Надсилання сповіщень** – package «Надсилання сповіщень». Acts through the cron sender tick (every 1 minute).
6. **Поштовий сервіс** – external service.
7. **Google OAuth 2.0** – external service. Used only if the client is not signed in.

## 2. Messages in order

### Part A. Creating the invitation

| # | From | To | Label | Type |
| --- | --- | --- | --- | --- |
| 1 | Психолог | Застосунок | Створити запрошення (e-mail клієнта) | synchronous |
| 2 | Застосунок | База даних | Знайти користувача за e-mail; перевірити зв’язок із психологом | synchronous |
| 3 | База даних | Застосунок | Результат перевірки | return |
| 4 | Застосунок | База даних | Знайти відкладене запрошення для цього e-mail | synchronous |
| 5 | База даних | Застосунок | Запрошення або порожньо | return |
| 6 | Застосунок | База даних | Почати транзакцію: зберегти запрошення (статус «очікує») і запис у чергу листів | synchronous |
| 7 | База даних | Застосунок | Запрошення збережено | return |
| 8 | Застосунок | Психолог | Запрошення з посиланням (201) | return |

Fragments in part A:
- **alt** around messages 2–3. Branch «e-mail психолога або клієнт уже зв’язаний із ним»: Застосунок → Психолог, label «Помилка: SelfLinkNotAllowed / AlreadyLinked (400)». The flow ends. Branch «інакше»: continue.
- **alt** around messages 4–8. Branch «відкладене запрошення вже існує»: Застосунок → Психолог, label «Існуюче запрошення з посиланням». Messages 6–7 are skipped. Branch «інакше»: messages 6–8.
- Messages 6 and 7 are **one transaction**: draw a note on the База даних lifeline «одна транзакція: запрошення і запис у чергу».

### Part B. Sending the email (asynchronous)

| # | From | To | Label | Type |
| --- | --- | --- | --- | --- |
| 9 | Надсилання сповіщень | База даних | Вибрати записи черги зі статусом «очікує» (щохвилини) | synchronous, self-triggered by cron |
| 10 | База даних | Надсилання сповіщень | Запис «запрошення створено» | return |
| 11 | Надсилання сповіщень | Поштовий сервіс | Надіслати лист із посиланням на запрошення | synchronous |
| 12 | Поштовий сервіс | Клієнт | Лист із посиланням | asynchronous (dashed line to the Клієнт lifeline) |
| 13 | Надсилання сповіщень | База даних | Позначити запис як надісланий | synchronous |

Fragments and notes in part B:
- Draw message 9 with a note «запускає планувальник, не запит користувача». Message 9 starts after message 8, with no arrow from Психолог.
- **alt** around messages 11–13. Branch «збій надсилання»: Надсилання сповіщень → База даних, label «Збільшити лічильник спроб (до 3); після 3-ї спроби статус «не вдалося»». Branch «успіх»: messages 12–13.
- Note near message 8: «Відповідь психологу не чекає на лист: запрошення існує, навіть якщо лист не надіслано».

### Part C. Accepting the invitation

| # | From | To | Label | Type |
| --- | --- | --- | --- | --- |
| 14 | Клієнт | Застосунок (браузер клієнта – сторінка запрошення) | Відкрити посилання з токеном | user action |
| 15 | Клієнт | Google OAuth 2.0 | Увійти через обліковий запис Google | synchronous |
| 16 | Google OAuth 2.0 | Клієнт | Підтвердження входу | return |
| 17 | Клієнт | Застосунок | Прийняти запрошення (токен) | synchronous |
| 18 | Застосунок | База даних | Знайти запрошення за токеном | synchronous |
| 19 | База даних | Застосунок | Запрошення | return |
| 20 | Застосунок | База даних | Почати транзакцію: позначити запрошення прийнятим; створити або відновити зв’язок «психолог–клієнт» | synchronous |
| 21 | База даних | Застосунок | Зв’язок збережено | return |
| 22 | Застосунок | Клієнт | Ідентифікатори психолога та клієнта (200) | return |

Fragments in part C:
- **opt** around messages 15–16: condition «клієнт ще не увійшов». The browser saves the token before sign-in and sends it after sign-in (message 17).
- **alt** after message 19. Branch «запрошення не знайдено / уже прийняте / e-mail користувача не збігається з запрошеним / самозапрошення / зв’язок уже існує»: Застосунок → Клієнт, label «Помилка (404 або 400: AlreadyAccepted, EmailMismatch, SelfLinkNotAllowed, AlreadyLinked)». The flow ends. Branch «інакше»: messages 20–22.
- Note on message 20: «ON CONFLICT: якщо зв’язок раніше був розірваний, час від’єднання очищується».
- After message 22 draw a note on Клієнт: «обирається роль «клієнт»; відкривається кабінет клієнта».

### Part D. Psychologist sees the client and plans a session

| # | From | To | Label | Type |
| --- | --- | --- | --- | --- |
| 23 | Психолог | Застосунок | Відкрити список клієнтів | synchronous |
| 24 | Застосунок | База даних | Вибрати клієнтів психолога | synchronous |
| 25 | База даних | Застосунок | Список клієнтів | return |
| 26 | Застосунок | Психолог | Список клієнтів, що містить нового клієнта | return |
| 27 | Психолог | Застосунок | Створити сесію з цим клієнтом | synchronous |
| 28 | Застосунок | База даних | Перевірити, що клієнт зв’язаний із психологом | synchronous |
| 29 | База даних | Застосунок | Зв’язок активний | return |
| 30 | Застосунок | Психолог | Сесію створено | return |

Fragments and notes in part D:
- Draw a break before message 23 with the note «психолог бачить клієнта лише коли сам завантажує список; сповіщення психологу немає».
- **alt** after message 29. Branch «зв’язку немає»: Застосунок → Психолог, label «Помилка ClientNotLinked (400)». Branch «інакше»: message 30.
- Message 27–30 is a summary. The full session-creation flow (time checks, Google Meet link) belongs to 2.6.2. Add a note «деталі створення сесії – підрозділ 2.6.2».

## 3. Optional branch: cancelling a pending invitation

Draw as a separate **opt** fragment between parts B and C, or omit it if the diagram is too large.

| # | From | To | Label |
| --- | --- | --- | --- |
| a | Психолог | Застосунок | Видалити запрошення |
| b | Застосунок | База даних | Видалити запрошення, якщо його статус «очікує» |
| c | Застосунок | Психолог | 204 (або помилка InvalidStatus, якщо запрошення вже прийняте) |

## 4. What the diagram must make visible

- The invitation is saved and the response returns before the email is sent (parts A and B are separate).
- Sending is done by the cron sender, not by the request (message 9 has no incoming arrow from a user).
- The accept step needs a signed-in client whose e-mail matches the invitation (part C alt).
- The psychologist gets no notification of the acceptance (the note before message 23).

## 5. Known differences from the paper text

- Section 2.3 says the invitation is for unregistered clients. The code also accepts the e-mail of a registered user. The second way to add a client (`POST /api/clients`, registered users only) is not part of this diagram.
- The code has no "decline invitation" step. Do not draw one.

## 6. Open points to confirm before drawing

- Message 9–13: confirm in `notifications/services.ts` (`runSenderTick`) that the invitation email checks the invitation status before sending. I did not read it. If it does not, a deleted invitation can still receive an email.
