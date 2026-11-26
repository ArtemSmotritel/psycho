# paper.md – issues found

Scope: full read of `paper.md` (text only; embedded images skipped). Line numbers refer to `paper.md`. Each issue has a quote you can search for.

Cut-off sentences: none found. The nearest cases are in group 2 (unclear sentences).

Severity: **A** = fix before submission, **B** = should fix, **C** = polish.

---

## 1. Numbers and references that do not match (A)

### 1.1 Citation numbers in the body do not match the source list
The source list has 30 entries (lines 971–1000). Many in-text citations point to the wrong number. Examples:

| Line | Quote | Cited | Source list entry |
|---|---|---|---|
| 544 | `Bun \[[12](#bookmark=id.lf4d7nqlpbq1)\]` | 12 (same as TypeScript) | Bun is 13 |
| 545 | `Hono \[[1](#bookmark=id.8xhtlvk03iut)3\]` | 13 | Hono is 14 |
| 546 | `PostgreSQL \[[1](#bookmark=id.4yw9lovhvhkj)4\]` | 14 | PostgreSQL is 15 |
| 547 | `через вбудований PostgreSQL-клієнт середовища Bun \[[15]` | 15 | Bun SQL is 17 |
| 548 | `бібліотеці React \[[1](#bookmark=id.ey64m7uu9t8z)6\]` | 16 (same as JSONB) | React is 18 |
| 548 | `React Router \[[1](#bookmark=id.klaf245fouf4)7\]` | 17 | React Router is 19 |
| 549 | `shadcn \[[18]` / `Tailwind CSS \[[19]` | 18 / 19 | 20 / 21 |
| 550 | `Better Auth \[[20]` | 20 | 22 |
| 551 | `WebSocket \[[21]` / `Excalidraw \[[22]` | 21 / 22 | 23 / 24 |
| 552 | `Brevo \[[23]` | 23 | 25 |
| 553 | `редактор коду Zed \[[24]` | 24 | 26 |
| 558 | `Axios \[[26]` | 26 | 27 |
| 563 | `Bun.cron \[[27]` | 27 | 28 |
| 569 | `Bun SQL") \[[16]` | 16 | 17 |
| 569 | `node-postgres \[[28]` | 28 | 29 |
| 603 | `Transactional Outbox \[[25]` | 25 | 30 |

Also: the citation order in 3.1 is not sequential (14, 16, 15, …), and lines 545, 546, 548 split the number across the link (`\[[1](…)3\]`), so only the "1" is a link.

### 1.2 Front-matter statistics
Line 191: `список використаних джерел (25 найменувань), 12 додатків. Загальний обсяг роботи становить 98 сторінки основного тексту, 32 малюнка та 21 таблиці.`
- The source list has **30** entries, not 25.
- The table of contents lists **13** appendices (А, Б, В, Г, Д, Е, Ж, И, К, Л, М, Н, П), not 12.
- The document has **33** figures (17 in the main text, 16 in the appendices), not 32.
- Grammar: `98 сторінки` → `98 сторінок`; `32 малюнка` → `32 малюнки`; `21 таблиці` → `21 таблиця`.

### 1.3 Wrong table number in continuation headers
- Lines 1034, 1046, 1056: `Продовження таблиці 1` → should be `Продовження таблиці Г.1`.
- Lines 1118, 1132: `Продовження таблиці 1` → should be `Продовження таблиці Н.1`.

### 1.4 Source list date inconsistency
Line 982: `TypeScript Documentation: вебсайт. URL: … (дата звернення: 08.07.2026)`. All other entries say `10.11.2026`. One of them is probably a typo.

---

## 2. Grammar errors, typos, unclear sentences (A/B)

| # | Line | Quote | Problem |
|---|---|---|---|
| 1 | 885 | `Він який дає миттєвий огляд поточного стану роботи` | Extra word. Should be `Він дає…` or `Він, який дає…` (and the sentence has no main verb as written). |
| 2 | 954 | `Змодельовано три бізнес-процеси, три актори (гість, психолог, клієнт) і сформульовано 20 користувацьких історій.` | Case error: `три актори` has no verb. Should be `визначено трьох акторів`. |
| 3 | 250 | `переважно зосереджені на адміністративних робочих процесах` | Plural adjective does not agree with the subject (`SimplePractice`). Rewrite as `зосереджена`/`фокус на…`. |
| 4 | 323 | `Доступ є і в клієнта, який уже має хоча б одного психолога. Інакше клієнт не може брати участь у сесіях.` | Logic and wording are unclear. `Інакше` has no clear antecedent. Reads like a missing sentence. |
| 5 | 508 | `Допоміжна сутність розширює вкладення типу “рекомендація”.` | The entity is not named. The next sentence introduces `RecommendationReaction`. Name it here. |
| 6 | 450 | `Під час моделювання цього процесу стало зрозуміло кілька вимог.` | Awkward. Compare line 467: `виявилось кілька вимог`. Suggest `було виявлено кілька вимог`. |
| 7 | 439 | `сервер шукає інформацію про сесію в оперативній пам’яті, або завантажує збережений стан із бази даних, якщо його не знайдено` | Misplaced comma before `або`, and a clumsy order. |
| 8 | 582 | `Модуль перевіряє з якого сайту прийшов запит` | Missing comma: `перевіряє, з якого сайту`. |
| 9 | 587 | `Також, стан кімнати зберігається` | Comma after `Також` is wrong. |
| 10 | 702 | `Ця функція викликається після кожної вставки рядка в таблицю user, і додає` | Comma before `і` joins two verbs of one subject. Remove it. |
| 11 | 1051 | `Після успішного створення, Google Meet зʼявляється` | Comma after the adverbial phrase is not needed. |
| 12 | 198 | `Інформація про клієнта часто розкидана … Психологи часто стикаються` | `часто` appears twice in two neighbouring sentences. |
| 13 | 176 | `весь спектр дій, які психологи виконують` | `які … які` repeated in one sentence in the intro (line 176: `інструментів, які б підтримували … дій, які`). Rephrase. |
| 14 | 243 | `як для лікарів, так і для клієнтів` | `лікарів` – the thesis is about psychologists. Use `психологів`/`фахівців`. |
| 15 | 600 | `Розробка модулю сповіщень та нагадувань` (also TOC line 120) | `модулю` → `модуля` (genitive). Same at line 868: `Усередині модулю`. |
| 16 | 916 | `Макет елементу візуалізації прогресу клієнта` | `елементу` → `елемента`. |
| 17 | 632 | `Таблиця 3.1 – атрибути таблиці “user”` | Lower-case `атрибути`. All other table titles use `Атрибути`. |
| 18 | 1000 | `Microservices Patterns : with examples in Java / C. Richardson. Indianapolis : Manning` | Space before colon (the source standard also needs a consistent form). Also, a book entry has a web URL and an access date. |
| 19 | 996 | `26. Zed editor. URL:` | The `: вебсайт.` marker is missing, unlike the other entries. |

---

## 3. Punctuation and typography (B/C)

### 3.1 Mismatched quote marks
Opening `“` closed by a straight `"`:
- Lines 144, 146, 150 (TOC), 1013, 1017, 1067 (headings): `ПСИХОЛОГ"`, `КЛІЄНТ"`, `ПРОВЕДЕННЯ СЕСІЙ"`.
- Line 519: `(наприклад, “Асоціативне зображення")`.
- Line 569: `(інтерфейс “Bun SQL")` and `(пул pg Pool, інтерфейс “node-postgres")`.
- Line 979: `ДУ "Територіальне медичне об'єднання … по Харківській області”` (opens with `"`, closes with `”`).

### 3.2 Two quote styles mixed
The text uses `“…”` almost everywhere. Guillemets `«…»` appear in:
- Line 493: `пакету «Створення запрошень»`.
- Line 495: `зв’язок «психолог-клієнт»`.
- Line 955: `за шаблоном «клієнт–сервер»`.

### 3.3 Three apostrophe characters mixed
The text mixes `’` (U+2019, 86 uses), `ʼ` (U+02BC, 62 uses) and `'` (17 uses). Even one line mixes two (line 529: `зʼєднання` and `зв’язку`). Straight `'` appears in lines 593–595, 602, 610, 611, 613, 619, 621, 979. Pick one, preferably `’`, and replace the others.

### 3.4 Zero-width characters
Line 172: `Electronic Medical Record)​​.` contains two invisible zero-width characters before the full stop.

### 3.5 Typographic apostrophes in SQL defaults
Lines 818 and 848: `DEFAULT ’pending’` uses curly quotes. Real SQL uses straight quotes: `DEFAULT 'pending'`.

### 3.6 Caption broken across two lines
Lines 481–482: `Рисунок 2.4 – Діаграма діяльності етапу прийняття рішень пакету` then a line break and ` “Надсилання сповіщень”`. Join into one line.

---

## 4. Missing captions (B)

Appendices Б, В, Д, Е, Ж and Л hold a figure but no `Рисунок Б.1`-style caption (lines 1015, 1019, 1069, 1073, 1077, 1097). Appendices А, И, К, М have captions. The main text refers to these appendices only by letter, so it is not wrong, but the style is inconsistent. Add captions or state that these appendices contain one diagram each.

---

## 5. Terminology consistency (C)

- `додатки` (line 285: `мобільні додатки`, `десктопні додатки`) vs `застосунки` (line 285 next sentence: `вебзастосунки`). Use one word for "application".
- `Інфологічна діаграма` (caption line 503) vs `концептуальна модель` (line 500, TOC 2.6.6). Same thing, two names.
- `invitationRoutes` (line 867) vs `whiteboardRoutes` / `WhiteboardRoutes` (lines 875, 582): module names are written in three different cases.
- `Users Service` (line 530) vs `ClientsService` and `InvitationsService` (lines 611–612): the names in 2.7 and 3.3 do not follow one pattern (singular vs plural).

---

## 6. Facts checked against the code

The code confirms these numbers, so the paper is correct on them:
- Cursor and change flush every 50 ms (`useWhiteboardSync` test comment; paper lines 439, 595).
- Save delay is 5 seconds: `SAVE_DELAY_MS = 5_000` in `backend/src/features/whiteboard/limits.ts` (paper line 587).
- Decision tick every 10 minutes and sender tick every minute: `backend/src/features/notifications/cron.ts` (paper line 604).
- Table 3.18 rows sum to 460, and the text says 460. The 17 tables count (13 domain + 4 service) is correct.

Not verified: the 5-second client poll (paper line 598).

One point to consider: the non-functional requirement `до 100 мс` (line 369) is not tested anywhere in chapter 3.
