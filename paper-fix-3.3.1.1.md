# Fix for section 3.3.1.1 (draft for review, not inserted into paper.md)

Source lines in `paper.md`: 534–538. Checked against `backend/src/features/whiteboard/{routes,services,repo}.ts` and `appointments/{services,repo}.ts`.
This file covers every item for 3.3.1.1 from `paper-review-1-quick-fixes.md` and `paper-review-2-substantive.md`.

---

## Replacement text (Ukrainian)

Діаграма класів пакета “Інтерактивна дошка” сервера наведена в додатку Ж, рисунку Ж.1. Вона відображає реалізацію пакета, спроєктованого в підрозділі 2.6.1. У коді пакет складається з модуля маршрутів, сервісу та репозиторію. Сервіс і репозиторій є об’єктами TypeScript, а не класами. Маршрут дошки містить функції та змінні рівня модуля. На діаграмі їх згруповано в логічні класи зі стереотипом “module”.

WhiteboardRoutes обслуговує WebSocket-з’єднання за шляхом `/api/whiteboard/{appointmentId}`. Функція `upgradeWebSocket` з бібліотеки Hono приймає запит на з’єднання. Обробник спочатку отримує сесію користувача через `auth.api.getSession` бібліотеки Better Auth. Далі обробник викликає метод `getForParticipant(appointmentId, userId)` об’єкта AppointmentsService. Цей метод повертає сесію, лише якщо користувач є її учасником. Статус сесії обробник перевіряє сам. Дошка доступна, коли сесія має статус “active”. Тому клієнт може приєднатися лише після того, як психолог розпочав сесію.

З’єднання закривається з кодом 1008 в трьох випадках: користувач не автентифікований, сесію не знайдено або користувач не є її учасником, сесія не має статусу “active”. Якщо під час створення кімнати сталася помилка, з’єднання закривається з кодом 1011. Функція `parseMessage(raw)` розбирає вхідне повідомлення і повертає null для некоректного. Є три типи повідомлень: `elements`, `files` і `cursor`. Обробники `onOpen`, `onMessage` та `onClose` обробляють відкриття з’єднання, повідомлення та закриття.

Сервер перевіряє лише належність користувача до сесії. Він не розрізняє роль учасника. Обмеження, за яким зображення на дошку додає лише психолог, реалізовано в інтерфейсі.

Кімнати зберігаються в оперативній пам’яті процесу. Змінна `rooms` містить одну кімнату на кожну сесію. Змінна `saveTimers` містить таймер відкладеного збереження для кожної кімнати. Функція `broadcast(room, sender, message)` надсилає повідомлення всім учасникам кімнати, крім відправника. Функція `scheduleSave(appointmentId, room)` скидає таймер і запускає його знову на 3 секунди, задані константою `SAVE_DEBOUNCE_MS`. Збереження виконується лише тоді, коли протягом 3 секунд змін не було. Функція `flushPendingSave(appointmentId, room)` зберігає стан негайно, якщо таймер ще активний. Її викликає обробник `onClose`, коли закривається останнє з’єднання кімнати. Після цього кімнату видаляють з оперативної пам’яті. У базі даних стан лишається.

Повідомлення `elements` містить повний масив елементів. Сервер замінює збережений масив отриманим. Повідомлення `files` містить лише нові зображення. Сервер додає їх до наявних. Тому, якщо двоє учасників змінюють дошку одночасно, перемагає останнє отримане повідомлення. Версійного злиття елементів сервер не виконує.

Об’єкт WhiteboardService передає запити до WhiteboardRepo. Метод `loadState(appointmentId)` повертає збережений стан дошки, а за його відсутності – порожній. Метод `saveState(appointmentId, state)` зберігає стан дошки. Метод `clearState(appointmentId)` очищує його. Метод `clearState` викликається, коли психолог завершує сесію (модуль AppointmentsService). Після цього редагована дошка зникає, і лишається тільки її знімок у форматі PNG. Об’єкт WhiteboardRepo виконує SQL-запити. Методи `findStateByAppointmentId()`, `updateState()` та `clearState()` читають і змінюють поля `whiteboard_elements` та `whiteboard_files` таблиці `appointments`. Обидва поля мають тип JSONB. Окремої таблиці для дошки немає, бо кожна сесія має рівно одну дошку.

Інтерфейс WhiteboardState описує стан дошки. Поле `elements` містить елементи малюнка, поле `files` – додані зображення.

---

## What changed and why

| # | Old text | New text | Reason (code) |
|---|----------|----------|---------------|
| 1 | `серверу` | `сервера` | Grammar (quick-fix file). |
| 2 | Straight apostrophe `'` in `об'єктами`, `з'єднання` | `’` | One apostrophe form (G1). |
| 3 | `закривається з кодом 1008\.` | The stray backslash is gone. | Markdown escape error. |
| 4 | “Метод authenticate(headers) перевіряє сесію” | “Обробник … отримує сесію через `auth.api.getSession`” | `authenticate` does not exist. `routes.ts:106` calls `auth.api.getSession` inline. |
| 5 | “Метод upgradeWebSocket(appointmentId)” | “Функція `upgradeWebSocket` з бібліотеки Hono” | It is the Hono helper (`config/websocket`) that takes a handler. It has no `appointmentId` parameter. |
| 6 | “getForParticipant … перевіряє … що сесія має статус active” | `getForParticipant` only checks participation. The route checks the status. | `AppointmentsService.getForParticipant` calls `findByIdForParticipant` and returns the row. The check `appointment.status !== 'active'` is at `routes.ts:122`. |
| 7 | “Якщо перевірка не пройдена, з’єднання закривається з кодом 1008” | Three cases for 1008 and one case for 1011. | `routes.ts:110` (no session), `:124` (not found / not active), `:157` (init failure → 1011). |
| 8 | `RoomRegistry` object with fields and methods | Module-level variables and functions; the diagram groups them. | No `RoomRegistry` exists. `rooms`, `saveTimers`, `broadcast`, `scheduleSave`, `flushPendingSave` are module-level (`routes.ts:28–50`, `:90`). |
| 9 | “Метод broadcast/scheduleSave/flushPendingSave” | “Функція …” | They are functions, not methods. |
| 10 | “Клас WhiteboardService / WhiteboardRepo” | “Об’єкт …” | Both are frozen `const` objects (`as const`). The old first paragraph already says modules are objects. |
| 11 | Not mentioned | Close code 1011. | Review 2, M item. |
| 12 | Not mentioned | `clearState` runs when the session ends. | `appointments/services.ts:198`. Review 2, M item. |
| 13 | Not mentioned | Replace-all semantics of `elements`, merge semantics of `files`. | `routes.ts:~140`: `room.state.elements = msg.elements`, `room.state.files = { ...room.state.files, ...msg.files }`. Review 2 (3.3.1.2), consequence for concurrent edits. |
| 14 | Not mentioned | The server does not check roles on the board. | `onMessage` accepts `elements` and `files` from any participant. See review 2, section 2.3. |
| 15 | Not mentioned | Room removal: memory only, the database state stays. | `onClose` calls `rooms.delete`; nothing is removed from the database. Same error as 2.6.1 in review 2. |
| 16 | Not mentioned | Message types `elements`, `files`, `cursor`. | `parseMessage` switch. |

## Open points for you

- **Diagram Ж.1** (appendix Ж) is an image. I could not inspect it. If it shows `RoomRegistry`, `authenticate()` or `upgradeWebSocket(appointmentId)`, change it to match the text above.
- **Paragraph 14 (role check)** states a fact about the current code. If you add a role check to the WebSocket handler later, delete that paragraph. The same issue appears in 2.3, 2.5, FR 6 and appendix Л row 6.
- **The wording of the close paragraph** says “У базі даних стан лишається”. After the session ends, `clearState` removes it. The text says so in the next paragraph. Keep both sentences, or merge them.
- **Heading of the first paragraph** keeps the stereotype “module”. Check that the diagram uses the same stereotype.
- **Inline code formatting** (backticks) is my choice. Remove it if the paper writes identifiers in plain text, as the old text did.
