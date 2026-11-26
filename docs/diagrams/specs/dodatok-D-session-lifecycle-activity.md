# Додаток Д, рисунок Д.1 — Діаграма діяльності пакету «Проведення сесій»

DRAFT for review. This diagram replaces the old board-only diagram in `dodatok-K-whiteboard-activity.md`. The old file stays until you approve this draft.

## Purpose

The diagram follows one session from the start command to the end command. It has three parts: the start of the session, the work on the board, and the end of the session. The work on the board keeps the content of the old diagram: initial sync, change cycle, loss of the connection.

The diagram shows the idea of the algorithm, not the code. It names no messages, variables, functions, limits or tables. Error codes are not named either.

## Lanes (actors)

1. **Психолог** — the person. Gives the start command and the end command. His browser builds the final snapshot.
2. **Браузер учасника** — the browser of any participant, psychologist or client. Opens the board, syncs, sends changes, reconnects. The client has no start or end command, so this lane has no separate client lane.
3. **Сервер** — checks rules, keeps the room, saves, ends the session.

Two storages appear in the diagram. Use these names every time.
- «Швидке сховище» — the room in the server memory. It holds the working copy of the board. All merges change it. It is lost if the server stops.
- «Довготривале сховище» — the database. It holds the permanent copy. The server writes the working copy to it with a delay, and reads it only when it loads a room.

## Part 1. Start of the session

| # | Lane | Action or decision |
|---|---|---|
| 1 | Психолог | Start ●. Action: «Подати сигнал про початок сесії» |
| 2 | Сервер | Decision: «Сесія ще не почалася і ще не закінчилася?» |
| 3 | Сервер | Decision: «У психолога є інша активна сесія?» |
| 4 | Сервер | Action: «Зафіксувати початок сесії; сесія стає активною» |

Arrows:
- 1 → 2.
- 2 «Ні» → action «Відхилити початок сесії» → end ◉ (lane Сервер).
- 2 «Так» → 3.
- 3 «Так» → action «Відхилити початок сесії» (the same node as above).
- 3 «Ні» → 4.
- 4 → first action of Part 2.

## Part 2. Work on the board

| # | Lane | Action or decision |
|---|---|---|
| 5 | Браузер учасника | Action: «Запит на підключення до дошки сесії» |
| 6 | Сервер | Decision: «Користувач має доступ до активної сесії?» |
| 7 | Сервер | Decision: «Стан дошки є у швидкому сховищі?» |
| 8 | Сервер | Action: «Завантажити стан дошки з довготривалого сховища у швидке сховище» |
| 9 | Браузер учасника | Action: «Повідомити серверу, які зображення вже є на дошці учасника» |
| 10 | Сервер | Action: «Передати учаснику зображення, яких йому бракує» |
| 11 | Сервер | Action: «Передати учаснику стан дошки зі швидкого сховища і перелік зображень, яких бракує серверу» |
| 12 | Браузер учасника | Action: «Об'єднати стан сервера з локальною дошкою» |
| 13 | Браузер учасника | Action: «Надіслати серверу зображення, яких йому бракує, і об'єкти, яких немає на сервері» |
| 14 | Сервер | Action: «Об'єднати надіслане зі станом у швидкому сховищі і передати іншим учасникам прийняті зміни» |
| 15 | Браузер учасника | Loop condition: «З'єднання є?» |
| 16 | Браузер учасника | Action: «Користувач змінює дошку» |
| 17 | Браузер учасника | Action: «Надіслати серверу лише змінені об'єкти» |
| 18 | Сервер | Action: «Об'єднати зміни зі станом у швидкому сховищі: у кожного об'єкта перемагає новіша версія» |
| 19 | Сервер | Action: «Передати іншим учасникам прийняті зміни» |
| 20 | Сервер | Action: «Повернути відправнику новіші версії сервера, якщо він мав застарілі» |
| 21 | Сервер | Action: «Запланувати запис у довготривале сховище, якщо його ще не заплановано» |
| 22 | Браузер учасника | Action: «Об'єднати отримані зміни з локальною дошкою» |
| 23 | Сервер | Decision: «Усі учасники вийшли з дошки?» |
| 24 | Сервер | Action: «Записати зміни у довготривале сховище і вивантажити стан зі швидкого сховища» |
| 25 | Браузер учасника | Action: «Прочитати причину закриття з'єднання» |
| 26 | Браузер учасника | Decision: «Сервер заборонив перепідключення?» |

Arrows:
- 5 → 6.
- 6 «Ні» → action «Відхилити підключення» → end ◉ (lane Сервер).
- 6 «Так» → 7.
- 7 «Ні» → 8 → 9. 7 «Так» → 9.
- 9 → 10 → 11 → 12 → 13 → 14 → 15.
- 15 «Так» → 16 → 17 → 18 → 19 → 20 → 21 → 22 → back to 15.
- 15 «Ні» → 23.
- 23 «Так» → 24 → 25. 23 «Ні» → 25.
- 25 → 26.
- 26 «Ні, перепідключення після наростаючої паузи» → back to 5.
- 26 «Так» → first action of Part 3.

The step 21 starts a separate background flow in the server lane: the first change starts one timer, a later change does not restart it, and the timer writes the working copy to the «Довготривале сховище». Draw it as a note on step 21, or as a second small diagram, as the old diagram did. Decide when you review.

## Part 3. End of the session

| # | Lane | Action or decision |
|---|---|---|
| 27 | Психолог | Action: «Подати сигнал про завершення сесії» |
| 28 | Психолог | Action: «Сформувати підсумковий знімок дошки і надіслати серверу» |
| 29 | Сервер | Decision: «Сесія активна?» |
| 30 | Сервер | Action: «В одній транзакції: позначити сесію завершеною, зберегти знімок, очистити стан дошки у довготривалому сховищі» |
| 31 | Сервер | Action: «Закрити з'єднання з усіма учасниками і вивантажити стан зі швидкого сховища; незбережені зміни відкинуті» |
| 32 | Браузер учасника | Action: «Показати знімок в історії сесій» |

Arrows:
- 27 → 28 → 29.
- 29 «Ні» → action «Відхилити завершення сесії» → end ◉ (lane Сервер).
- 29 «Так» → 30 → 31 → 32 → end ◉.

## Checked against the code

- Start rules: `AppointmentsService.startForPsycho` — status upcoming or warning, no other active session of the psychologist, then `markStarted`.
- End rules: `AppointmentsService.endForPsycho` — one transaction with `markEnded` and `clearState`, then `WhiteboardRooms.closeRoom` outside the transaction.
- Board access: `routes.ts` — session, participant, status active.
- Sync, merge, forward, stale reply, schedule: `rooms.ts`, `handleMessage`.
- Reconnect and the change interval: `useWhiteboardSync.ts`.

## Open points

1. Step 31 and step 30 differ in order from your first sketch: the state is cleared before the sockets close. This follows the code.
2. Step 32 shows the snapshot to both participants. I did not check the frontend for who sees the snapshot first. Verify, or remove the step.
3. Steps 27 and 28: the browser builds the snapshot before the request, as the code takes `snapshotDataUrl` in the request body.
