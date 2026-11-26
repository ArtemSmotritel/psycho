# Додаток Д — Діаграма діяльності пакету «Інтерактивна дошка»

UML activity diagram with two swimlanes: **Браузер** and **Сервер**. Start ● at top of Браузер lane. Use diamonds ◇ for decisions, rounded rectangles for actions, ◉ for end. Use a fork bar for the parallel flows.

The diagram shows the idea of the sync algorithm, not the code. It names no messages, variables, functions, limits or tables.

Two storages appear in the diagram. Use these names every time. «Швидке сховище» (the room in the server memory) holds the working copy of the board. All merges change it. It is lost if the server stops. «Довготривале сховище» (the database) holds the permanent copy. The server writes the working copy to it with a delay, and reads it only when it loads a room.

---

# Варіант 2 — без паралельних гілок у циклі

Two diagrams. Diagram 2a is one sequential change cycle. Diagram 2b is the background write flow, which has its own start. The first change starts it, and later changes do not restart it. It has no join with the cycle. The first diagram above stays as variant 1.

## 2a. Цикл змін

@startuml
skinparam defaultFontSize 20

|Браузер|
start

repeat
  |Браузер|
  :Запит на підключення до дошки сесії;

  |Сервер|
  if (Користувач має доступ\nдо активної сесії?) then (Ні)
    :Відхилити підключення;
    stop
  else (Так)
  endif
  if (Стан дошки є у швидкому\nсховищі?) then (Ні)
    :Завантажити стан дошки з довготривалого\nсховища у швидке сховище;
  else (Так)
  endif

  ' --- 1. ПОЧАТКОВА СИНХРОНІЗАЦІЯ ---
  |Браузер|
  :Повідомити серверу, які зображення\nвже є на дошці клієнта;

  |Сервер|
  :Передати клієнту зображення, яких йому бракує;
  :Передати клієнту стан дошки зі швидкого сховища\nі перелік зображень, яких бракує серверу;

  |Браузер|
  :Об'єднати стан сервера з локальною дошкою;
  :Надіслати серверові зображення, яких йому бракує,\nі об'єкти, яких немає на сервері;

  |Сервер|
  :Об'єднати надіслане зі станом у швидкому сховищі\nі передати іншому учаснику прийняті зміни;

  ' --- 2. ЦИКЛ ЗМІН ---
  while (З'єднання є?) is (Так)
    |Браузер|
    :Користувач змінює дошку;
    :Надіслати серверові лише змінені об'єкти;

    |Сервер|
    :Об'єднати зміни зі станом у швидкому сховищі:\nу кожного об'єкта перемагає новіша версія;
    :Передати іншому учаснику прийняті зміни;
    :Повернути відправнику новіші версії сервера,\nякщо він мав застарілі;
    :Запланувати запис у довготривале сховище,\nякщо його ще не заплановано;

    |Браузер|
    :Об'єднати отримані зміни з локальною дошкою;
  endwhile (Ні)

  ' --- 3. ВТРАТА З'ЄДНАННЯ ---
  |Сервер|
  if (Усі учасники вийшли\nз дошки?) then (Так)
    :Записати зміни у довготривале сховище\nі вивантажити стан зі швидкого сховища;
  else (Ні)
  endif

  |Браузер|
  :Прочитати причину закриття з'єднання;
repeat while (Сервер заборонив\nперепідключення?) is (Ні, перепідключення\nпісля наростаючої паузи) not (Так)

' --- 4. ЗАВЕРШЕННЯ СЕСІЇ ---
|Сервер|
:Видалити стан дошки з довготривалого\nі зі швидкого сховища;
:Закрити з'єднання з усіма учасниками;
stop

@enduml
