# Paper review 1 — quick fixes (each under ~10 seconds)

Source: `paper.md` (1105 lines). Line numbers below refer to that file.
Items here need no thinking: typos, grammar, wrong cross-references, placeholders with a known value, formatting.
Items that need a decision, or that conflict with the code, are in `paper-review-2-substantive.md`.

---

## Global (apply across the whole paper)

| # | Issue | Fix |
|---|-------|-----|
| G1 | Three apostrophe characters are mixed: `’` (63 uses), `ʼ` (61 uses), `'` (20 uses). The straight `'` sits mostly in lines 534–569 and 892. | Search and replace all three with one character (use `’` or `ʼ`, one only). |
| G2 | Quotes are mixed: an opening `“` is closed with a straight `"`. Examples: lines 121, 123, 127, 137, 347, 358, 371, 382, 385, 393, 441, 448, 451, 453, 472–474, 482–485, 522, 920, 924, 938, 974, 1016. The bullets in lines 514–518 open with `"` and close with `”`. | Replace every `"` that closes a Ukrainian quote with `”` (or switch everything to `«…»`, the usual Ukrainian style). |
| G3 | The link `психолог–клієнт` has three forms: `психолог–клієнт` (lines 367, 385, 1016) and `психолог-клієнт` (lines 462, 472, 560). | Use one dash everywhere. |
| G4 | Citation format is mixed: `[1]`–`[8]` are hyperlinks to bookmarks, `[9]` (line 266) is a bare `\[9\]`, and `[10]`–`[24]` are bare text. | Make all citations the same form. |
| G5 | The word `вебсервіс` is used for the whole system, but the text also says `вебзастосунок` and `вевебсервербсервер`. A "web service" means an API in Ukrainian IT usage. | Pick one term (`вебзастосунок` is the safer one) and replace it everywhere. |
| G6 | `дашборд` is declined in two ways: `дашборду` (line 822) and `дашборда` (line 844). | Use `дашборда` everywhere. |
| G7 | The e-mail word has two forms: `e-mail` (lines 939, 1016) and `електронна пошта` / `пошта` elsewhere. | Use `електронна пошта` everywhere. |
| G8 | The terms `логін` (line 649) and `ім’я користувача` (line 462) name the same field (`clients.username`). | Use one term. |

---

## Title page (lines 7–33)

- Line 31: stray `\_` after `Порубльов І.М.`. Delete it.
- Line 31: `вчені ступінь та звання` → `вчений ступінь та звання`.

## Table of contents (lines 35–133)

- Lines 131 and 133: the appendix list does not match the body.
  - `ДОДАТОК Ж – СХЕМА ПЕРЕХОДІВ…` is appendix **К** in the body (line 999).
  - `ДОДАТОК ЖЖ – ТАБЛИЦЯ РЕЗУЛЬТАТІВ…` is appendix **Л** in the body (line 1005).
  - The real appendix **Ж** (class diagrams, line 982) and **И** (flowcharts, line 992) are missing from the list.
  - Fix: regenerate the list. The anchors `#додаток-k…` and `#додаток-л…` already point at the body headings.
- Line 103: `3.3.XX` is a placeholder. It must be `3.3.4`.
- Lines 101–103: the entries for `3.3.1`, `3.3.1.1`, `3.3.1.2`, `3.3.2`, `3.3.3` are missing. Regenerate the table of contents.
- All page numbers: regenerate after the final edit.

## Скорочення та умовні позначення (lines 137–139)

- Line 137: mixed quotes (`“Про … здоров’я"`). See G2.
- Line 139: two invisible zero-width characters after `Record)`. Delete them.
- The list defines only HIPAA, SOAP and ЕМК. The paper also uses API, REST, SPA, UML, OAuth, SQL, ORM, JSONB, HTTP, WebSocket, MVC/MVP/MVVM, SOA, LSP, ПЗ. Add the ones you want expanded.

## Вступ (lines 143–158)

- Line 158: three `ХХХ` placeholders. Values at this time:
  - figures: **17** in the body (1.1, 1.2, 2.1–2.8, 3.1–3.7), more if you add figures to chapter 3;
  - sources: **24**;
  - appendices: **10** (А, Б, В, Г, Д, Е, Ж, И, К, Л).
- Line 158: `списку використаної джерел` → `списку використаних джерел`.

## 1.1 Актуальність (lines 164–175)

- Line 167: `онлай-сесій` → `онлайн-сесій`.

## 1.2 Огляд систем (lines 177–248)

- Line 210 (SimplePractice, advantages): `як для лікарів, так і для клієнтів` → `як для терапевтів, так і для клієнтів`. The rest of the paper says "психолог/терапевт".
- Line 250: an empty heading `## ` sits between 1.2.4 and 1.3. Delete it.

## 1.4 Постановка завдання (lines 258–275)

- Line 265: the list of objects is in mixed cases: `…автоматичну зміну статусу сесії … та генерацією посилання … та інтеграцією з Google Calendar`. Fix: `…автоматичну зміну статусу сесії, генерацію посилання на відеозустріч Google Meet та інтеграцію з Google Calendar`.
- Line 266: `\[9\]` is a bare citation (see G4).

## 2.1 Моделювання бізнес-процесів (lines 283–294)

- Line 285: the paper names process 2 `проведення сесії`, but the title of figure А.2 (line 914) is `Діаграма бізнес-процесу “Сесія”`. Rename one of them.
- Line 292: `приймати участь` → `брати участь`.
- Line 293: `Варто відмітити` → `Варто зазначити`.

## 2.5 Попереднє архітектурне проєктування (lines 345–358)

- Line 347: `Причини вибору архітектури “клієнт–сервер".` ends with a period, but a list follows. Use a colon.
- Line 347: mixed quotes (G2).

## 2.5.1 / 2.5.2 (lines 360–393)

- Lines 371, 382, 385, 393: mixed quotes (G2).

## 2.6.1 Проведення сесії (line 407)

- `завантажує збережений стан із бази даних, якщо його не знайдено` is ambiguous ("його" = the state). The condition is about the room. Fix: `шукає кімнату в оперативній пам’яті; якщо кімнати немає, завантажує збережений стан із бази даних і передає клієнту повну сцену`.
- `передає йому повну сцену`: the pronoun has no noun in the same sentence. Name the client.

## 2.6.4 Надсилання сповіщень (lines 446–453)

- Lines 447–448: the caption of figure 2.4 is broken over two lines (`…пакету` / `“Надсилання сповіщень"`). Join the lines.
- Lines 451 and 453: mixed quotes (G2).

## 2.6.6 Даталогічна модель (lines 472–474)

- Line 474: `better-auth\[10\]` has no space before the citation.
- Line 474: double space in `бібліотекою,  тому`.
- Lines 472–474: mixed quotes (G2).

## 2.7 Уточнена архітектура (lines 482–485)

- Line 482: `ʼ` and `’` are mixed in one paragraph (G1).
- Lines 482–485: mixed quotes (G2).

## 3.2 Структурна схема (lines 512–522)

- Lines 514–518: the bullet quotes are `"HTTP API”` (straight open, curly close). Fix (G2).
- Line 522: mixed quotes (G2).

## 3.3.1.1 Серверна частина дошки (lines 534–538)

- Line 534: `Діаграма класів пакета “Інтерактивна дошка” серверу` → `…сервера`.
- Line 535: `закривається з кодом 1008\.` has a stray backslash before the period.
- Lines 534, 535: straight apostrophes (G1).

## 3.3.1.2 Клієнтська частина дошки (lines 542–548)

- Lines 542, 544: straight apostrophes (G1).

## 3.3.2 Сповіщення (lines 552–556)

- Line 552: straight apostrophe in `об'єктами` (G1).

## 3.3.3 Запрошення та керування користувачами (lines 560–569)

- Line 562: `тік відправника, описаний у підрозділі 3.3.3` → `…у підрозділі 3.3.2`. The sender tick is described in 3.3.2. This section is 3.3.3 itself.
- Lines 564–568: the numbered items are written `1\.`, `2\.` … (escaped dots). They do not render as a list. Remove the backslashes.
- Lines 560–569: straight apostrophes (G1).

## 3.3.XX База даних (lines 571–810)

- Line 571: heading `3.3.XX` → `3.3.4`.
- Lines 580–803: the captions of tables 3.1–3.17 start with a lower-case word (`Таблиця 3.1 – атрибути таблиці…`). The other tables use an upper-case word (`Таблиця 3.18 – Результати…`). Use `Атрибути`.
- Lines 766 and 796: the default value is written `’pending’` with typographic quotes. In SQL it is `'pending'`.
- Lines 649–652: the paragraph about the trigger function `ensure_user_role_rows` sits between the paragraph on `clients` and the caption of table 3.6. Move it after table 3.6.

## 3.4 Інтерфейс користувача (lines 812–849)

- Line 814: `однакова візуальний стиль` → `однаковий візуальний стиль`.
- Line 814: `єдиний шаблон форм для вкладення сесій` → `…для вкладень сесії`.
- Line 818: `Зі сторінки вкладенням можна повернутися` → `Зі сторінки вкладення можна повернутися`.
- Line 818: `додаток К` is Cyrillic, but the heading at line 999 is `ДОДАТОК K` with a **Latin** K. Fix the heading and the captions at lines 1001–1002 (`Рисунок K.1`, `K.2`) to use Cyrillic `К`.
- Line 819: `Дашборд – перший екран …, який психолог бачить …, який дає миттєвий огляд` has two `який`. Fix: `Дашборд – це перший екран …, який психолог бачить після входу в систему. Він дає миттєвий огляд …`.
- Line 822: `Рисунок 3.2. –` has an extra period. Use `Рисунок 3.2 –`.
- Lines 822 / 844: `дашборду` / `дашборда` (G6).

## 3.5 Тестування (lines 851–872)

- Line 871: `охоплює охоплює` — duplicated word.
- Line 872: `наведено у таблиці 3.1` → `таблиці 3.18`.
- Line 872: `у додатку З` → `у додатку Л`. There is no appendix З (Ukrainian appendix lettering skips З), and the test report is appendix Л.

## Список використаних джерел (lines 884–907)

- Line 886: `Pandemic : вебсайт` has a space before the colon.
- Line 907: `Zed editor: . URL` — the description between the colon and the period is empty. Add `вебсайт` or a title.
- Line 892: straight quotes and apostrophe in the organisation name. Use the typography chosen in G1/G2.

## Appendices (lines 909–1105)

- Line 999: heading `ДОДАТОК K` uses Latin K (see 3.4).
- Lines 1001–1002: `Рисунок K.1`, `K.2` use Latin K. The caption of K.2 is glued to the image of K.1 on the same line. Put it on its own line.
- Lines 911–918 (appendix А) and 984–990 (appendix Ж) put the caption **above** the image. Chapters 1–3 put the caption **below**. Use one order.
- Lines 930 and 1007: the table caption is `Таблиця 1 – …` in both appendix Г and appendix Л (and chapter 1 has `Таблиця 1.1`). Appendix tables are normally `Таблиця Г.1`, `Таблиця Л.1`.
- Line 939: `Зареєстровані користувачів – додаються` → `Зареєстровані користувачі – додаються`.
- Line 958: the note of requirement 14 has no final period.
- Line 1038: an em dash `—` in `а клієнт — про незавершені рекомендації`. The rest of the paper uses an en dash `–`.
- Lines 876 and 880 contain only `ЖЖ`. See the substantive file, section "Висновки".
