# Fix for section 3.3.1.2 (draft for review, not inserted into paper.md)

Source lines in `paper.md`: 540–548. Checked against `frontend/app/hooks/useWhiteboardSync.ts`, `routes/psychologist/live-session.tsx` and `routes/client/live-appointment.tsx`, and against `backend/src/features/whiteboard/routes.ts`.

Only paragraphs 1, 3, 4, 5 and 6 change. The paragraphs about LiveSession and LiveAppointment (the last two) are unchanged, except for the apostrophe rule.

---

## Replacement text (Ukrainian)

Діаграма класів компонентів активної сесії наведена в додатку Ж, рисунку Ж.2. Вона показує клієнтську частину пакета “Інтерактивна дошка” і пов’язаних з ним пакетів. Функціональні компоненти React змодельовано класами. Пропси та стан компонента показано як атрибути, а обробники подій – як операції. Стереотип “hook” позначає хуки, “page” – компоненти сторінок, “third-party” – компоненти сторонніх бібліотек.

Активну сесію відображають дві сторінки: LiveSession для психолога та LiveAppointment для клієнта. Вони мають однакову область дошки. Різняться лише бічна панель та дії після завершення сесії.

Хук useWhiteboardSync є спільною частиною обох сторінок. Він відкриває WebSocket-з’єднання зі шлюзом дошки за адресою /api/whiteboard/{appointmentId} і закриває його, коли сторінка зникає з екрана. Хук не відновлює з’єднання сам. Якщо з’єднання розірвано, поле connected дорівнює false, а курсори інших учасників зникають. Щоб знову отримати стан дошки, користувач відкриває сторінку заново. Метод setExcalidrawAPI(api) зберігає посилання на дошку. Якщо початковий стан сцени надійшов раніше за це посилання, хук тримає його в буфері і застосовує, коли дошка готова. Метод onWhiteboardChange(elements, appState, files) надсилає серверу повний масив елементів сцени, а з файлів – лише ті, яких сервер ще не отримав. Метод onPointerUpdate(payload) надсилає позицію курсора не частіше ніж раз на 50 мілісекунд. Поле remoteCursors містить курсори інших учасників, поле connected – стан з’єднання.

Сервер замінює збережений масив елементів тим масивом, який надійшов останнім (підрозділ 3.3.1.1). Тому, якщо психолог і клієнт змінюють дошку одночасно, зміни одного учасника можуть перезаписати зміни іншого. Версійне злиття елементів не виконується ні на клієнті, ні на сервері. Для сесії, у якій малює переважно психолог, а клієнт лише дивиться, цього достатньо.

Хук захищає дошку від двох помилок. Спочатку він порівнює підпис елементів з підписом, який надійшов від сервера. Підпис складається з ідентифікатора і версії кожного елемента. Якщо підписи збігаються, зміну викликало оновлення від сервера, і хук не надсилає її назад. Без цієї перевірки учасники нескінченно пересилали б одну сцену один одному. Також хук не надсилає порожній масив елементів, бо порожня сцена є артефактом ініціалізації Excalidraw і стерла б стан на сервері.

Компонент Excalidraw – це дошка бібліотеки Excalidraw. Сторінки передають йому три функції: excalidrawAPI, onChange та onPointerUpdate. Функції onChange і onPointerUpdate надає хук useWhiteboardSync. Функція excalidrawAPI зберігає посилання на дошку на самій сторінці і передає його хуку через setExcalidrawAPI. Компонент WhiteboardCursorOverlay малює курсори інших учасників поверх дошки. Він отримує remoteCursors і excalidrawAPI та перераховує координати за зсувом і масштабом дошки.

*(Далі без змін: абзаци про LiveSession і LiveAppointment, з апострофами ’.)*

---

## What changed and why

| # | Old text | New text | Reason |
|---|----------|----------|--------|
| 1 | `пов'язаних`, `з'єднання` (straight `'`) | `’` | One apostrophe form (G1). |
| 2 | Two lines end with two trailing spaces (Markdown line breaks) | Paragraphs are separated by a blank line | Quick cleanup. Optional. |
| 3 | “`onWhiteboardChange` … надсилає серверу змінені елементи та нові файли” | “…повний масив елементів сцени, а з файлів – лише ті, яких сервер ще не отримав” | `useWhiteboardSync.ts`: `ws.send({ type: 'elements', elements })` sends the whole array. Only files are filtered by `sentFilesRef`. |
| 4 | Not mentioned | New paragraph: the server replaces the array, so concurrent edits can overwrite each other | `whiteboard/routes.ts`: `room.state.elements = msg.elements`. The hook sends no version data. |
| 5 | Not mentioned | The hook does not reconnect | `ws.onclose` sets `connected=false` and clears cursors. No retry code. Matches review 2, section 2.6.1. |
| 6 | “Підпис елементів” without definition | Adds “ідентифікатор і версія кожного елемента” | `elementSignature` builds `id@version`. |
| 7 | “Усі три належать хуку useWhiteboardSync” | `onChange` and `onPointerUpdate` come from the hook. `excalidrawAPI` is a page callback (`handleExcalidrawAPI`) that calls `setExcalidrawAPI`. | `live-session.tsx:269` and `live-appointment.tsx:308` pass `handleExcalidrawAPI`, not the hook function. |

## Checked and correct (no change)

- Address `/api/whiteboard/{appointmentId}`; the hook closes the socket in the effect cleanup.
- Buffering of `scene_init` until the Excalidraw API is ready.
- Cursor limit 50 ms.
- Echo guard by signature and the empty-array guard.
- LiveAppointment polls every 5 seconds (`live-appointment.tsx:149–165`).

## Open points for you

- **Paragraph 4 last sentence** (“цього достатньо”) is my judgement, not a fact from the code. Delete it if you do not want to claim it.
- **Item 7** depends on `handleExcalidrawAPI`. I read only the lines that pass it to the component. I did not read its body. Confirm that it calls `setExcalidrawAPI`.
- **Diagram Ж.2** is an image. Check that it shows `handleExcalidrawAPI` only if you want the diagram to match item 7.
- **LiveSession and LiveAppointment paragraphs:** I did not verify “Різняться лише бічна панель та дії після завершення сесії”. The review files do not flag it.
