# Fixes for section 3.3.XX (database) in paper.md

Source of the findings: comparison of `paper.md` lines 530-769 with the live database `psychodb`, the migrations in `backend/src/migrations`, the backend code, and sections 2.6.5 and 2.6.6 of `paper.md`.

Status: DRAFT for review. Nothing in `paper.md` or in the code has been changed. The replacement texts are in Ukrainian and are plain text, ready to paste into the Google Doc. The explanations are in English.

## Summary

| ID | Where | What is wrong | Type |
| --- | --- | --- | --- |
| F1 | Paragraph before table 3.13 (line 705) | Text says the psychologist answers; the code and the column say the client answers | Contradicts the code and section 2.6.5 |
| F2 | First paragraph (line 532) | Text says the service tables were not foreseen; section 2.6.6 says they were left out on purpose | Contradicts section 2.6.6 |
| F3 | Figure 3.1 and its caption | The text says 17 tables are in the figure; the figure shows 13 | Mismatch with the figure |
| F4 | Trigger paragraph (line 609) | Paragraph sits in the wrong place and the text names the trigger before it is defined | Structure |
| F5 | Paragraph before table 3.16 | The `CHECK` that explains the nullable `recipient_user_id` is not mentioned | Missing fact |
| F6 | After the first paragraph | Common decisions (key type, defaults, time type, cascade rule) are not stated | Missing fact |
| F7 | Paragraph before table 3.16 | The dedup index is described without its columns and without the reason for `COALESCE` | Missing fact |
| F8 | Tables 3.14 and 3.16 | Curly apostrophes in `’pending’` | Typography |
| F9 | Section 2.6.6 (line 474) | The link `AssociativeImage` to `File` is called one-to-one; the schema enforces only many-to-one | Contradicts the schema |
| F10 | Headings of 3.3 and 3.3.XX | Placeholder `*todo*` and `3.3.XX` | Open item |
| F11 | `backend/src/features/attachments/services.ts` line 354 | Error text says "psychologist completion"; the client writes the completion | Code message (not edited) |

## F1. Direction of the impression answer

Where: `paper.md` line 705, the paragraph before table 3.13.

Why: The code allows only the client to create an impression and only the client to complete it. The column is `client_response`. Section 2.6.5 already says "відповідь клієнта". The current text says the opposite.

Current text:

```
Таблиця “impression_completions” зберігає відповідь психолога на враження клієнта. Первинний ключ attachment_id гарантує не більше однієї відповіді на враження. Атрибути таблиці наведено в таблиці 3.13.
```

Replace with:

```
Таблиця “impression_completions” зберігає відповідь клієнта на власне враження: після сесії клієнт створює враження, а потім може один раз доповнити його відповіддю. Первинний ключ attachment_id гарантує не більше однієї відповіді на враження. Атрибути таблиці наведено в таблиці 3.13.
```

## F2. Why the service tables are missing in chapter 2

Where: `paper.md` line 532, the first paragraph of the section.

Why: Section 2.6.6 says the Better Auth entities (sessions, accounts, verifications) are managed by the library and are not shown on the diagram. So they were known in chapter 2. The statement "потреба стала очевидною лише під час реалізації" is true only for `schema_migrations`. The same replacement also keeps the statement that `user` is a domain table, and it fixes the count logic: 13 domain tables match the 13 entities of section 2.6.6.

Current text:

```
База даних містить 17 таблиць: 13 доменних і 4 службових (рис. 3.1). Службові таблиці не були представлені під час проєктування у 2 розділі, бо потреба в них стала очевидною лише під час реалізації вебсервісу. Три службові таблиці (session, account, verification) створює бібліотека Better Auth для зберігання сеансів входу, зовнішніх облікових записів та верифікаційних значень. Четверта службова таблиця schema_migrations потрібна для механізму SQL-міграцій. Таблиця “user” створюється бібліотекою Better Auth для зберігання основної інформації про користувача. Попри те, що вона створюється бібліотекою, ця таблиця є доменною.
```

Replace with:

```
База даних містить 17 таблиць: 13 доменних і 4 службових. Тринадцять доменних таблиць відповідають сутностям даталогічної моделі підрозділу 2.6.6 (рисунок 3.1). Таблицю “user” створює бібліотека Better Auth, але вона є доменною: це сутність “Користувач” даталогічної моделі. Три службові таблиці (session, account, verification) також створює бібліотека Better Auth для зберігання сеансів входу, зовнішніх облікових записів та верифікаційних значень. Ці таблиці не показано на даталогічній діаграмі, бо ними керує сама бібліотека. Четверта службова таблиця, schema_migrations, у розділі 2 не розглядалася: потреба в ній виникла під час реалізації, бо механізм SQL-міграцій має десь зберігати перелік застосованих міграцій.
```

## F3. Figure 3.1 shows 13 tables, not 17

Where: `paper.md` line 535 (caption) and the figure itself.

Why: The figure was exported from dbdiagram.io and contains only the 13 domain tables. The F2 text already points to the figure for the 13 domain tables only. The caption must say the same. The image is also only 632 by 552 pixels, so the relationship lines cannot be read. Export it again at a larger size.

Current caption:

```
Рисунок 3.1 – Фізична модель бази даних
```

Replace with (option A, keep the figure as it is):

```
Рисунок 3.1 – Фізична модель бази даних (доменні таблиці)
```

Option B: add `session`, `account`, `verification` and `schema_migrations` to the figure, and keep the current caption. Then change the first sentence of F2 back to "(рисунок 3.1)" after "17 таблиць". Option A needs less work.

## F4. Trigger paragraph: move it after table 3.6 and fix the forward reference

Where: `paper.md` line 600 (`psychologists` paragraph) and line 609 (trigger paragraph).

Why: The `psychologists` paragraph names the trigger before the text defines it. The trigger paragraph also sits between the `clients` paragraph and table 3.6, which splits the paragraph from its table. The new paragraph also adds `ON CONFLICT DO NOTHING` and the backfill, which the migration `20260508002410_create-user-role-rows-trigger.sql` contains.

Step 1. In the `psychologists` paragraph (line 600), replace:

```
Рядок створює тригер user_role_rows під час створення користувача.
```

with:

```
Рядок створює тригер user_role_rows під час створення користувача (тригер описано нижче, після таблиці 3.6).
```

Step 2. Delete the current trigger paragraph from line 609:

```
Єдина збережена процедура в базі даних – тригерна функція ensure_user_role_rows. Ця функція викликається після кожної вставки рядка в таблицю user, і додає до таблиць psychologists і clients по одному рядку з ідентифікатором нового користувача.
```

Step 3. Insert this paragraph directly after table 3.6 (before the `psychologist_clients` paragraph):

```
Єдина збережена процедура бази даних – тригерна функція ensure_user_role_rows мовою PL/pgSQL. Тригер user_role_rows викликає її після кожної вставки рядка в таблицю user, а функція додає до таблиць psychologists і clients по одному рядку з ідентифікатором нового користувача. Вираз ON CONFLICT DO NOTHING робить повторний виклик безпечним. Завдяки цьому кожен новий користувач одразу має обидва профілі й може обрати будь-яку роль. Та сама міграція створила відсутні профілі для користувачів, які вже існували.
```

## F5. The CHECK on email_outbox recipients

Where: `paper.md` line 741, the paragraph before table 3.16. This text is part of the combined replacement in F7.

Why: In table 3.16, `recipient_user_id` has no `NOT NULL`, and `recipient_email` is optional. Without an explanation, a reader cannot see why. The real database has the `CHECK` `email_outbox_recipient_present`. The reason is in migration `20260720193800_extend-email-outbox-for-invitations.sql`: an invitation goes to a person who has no `user` row yet.

## F6. Common decisions for the whole schema

Where: new paragraph, directly after the first paragraph (after F2) and before figure 3.1.

Why: The paper never states that all foreign keys cascade on delete, except one. It also never states the key type and the default for the primary keys, or the time type. All of these are true in the live database. The exceptions are exact: `psychologists`, `clients`, `psychologist_clients`, `recommendation_reactions` and `impression_completions` have a foreign key as the primary key, so they have no default. The `user` identifier is generated by Better Auth. With this paragraph, the tables do not need a `DEFAULT gen_random_uuid()` row for every `id`.

Insert:

```
Власні первинні ключі доменних таблиць (окрім user, ідентифікатор якого генерує Better Auth) мають тип text і за замовчуванням заповнюються значенням функції gen_random_uuid(). У таблиць psychologists, clients, psychologist_clients, recommendation_reactions та impression_completions первинний ключ є одночасно зовнішнім ключем, тому значення за замовчуванням він не має. Усі моменти часу зберігаються у типі timestamptz. Усі зовнішні ключі, окрім associative_images.file_id, оголошено з ON DELETE CASCADE, тож видалення батьківського рядка видаляє залежні від нього рядки.
```

## F7. email_outbox paragraph (includes F5)

Where: `paper.md` line 741.

Why: Adds the `CHECK` (F5) and states the columns of the dedup index and the reason for `COALESCE` (F7). The real index `email_outbox_dedup` covers seven expressions: `type`, `appointment_id`, `attachment_id`, `invitation_id`, `recipient_user_id`, `recipient_email` and `variant`.

Current text:

```
Таблиця “email_outbox” є чергою вихідних листів: тип і варіант листа, адресат, пов’язана сесія, вкладення чи запрошення, статус, кількість спроб, остання помилка та час надсилання. Унікальний індекс email_outbox_dedup запобігає дублюванню листів, а частковий індекс за (status, scheduled_for) для статусу pending прискорює вибірку листів до надсилання. Атрибути таблиці наведено в таблиці 3.16.
```

Replace with:

```
Таблиця “email_outbox” є чергою вихідних листів: тип і варіант листа, адресат, пов’язана сесія, вкладення чи запрошення, статус, кількість спроб, остання помилка та час надсилання. Колонка recipient_user_id може бути порожньою, бо лист-запрошення адресовано людині, яка ще не має облікового запису: тоді адресу зберігає колонка recipient_email. Обмеження email_outbox_recipient_present вимагає, щоб було заповнено хоча б одну з цих двох колонок. Унікальний індекс email_outbox_dedup запобігає дублюванню листів і охоплює тип листа, сесію, вкладення, запрошення, адресата за ідентифікатором і за адресою та варіант листа. Необов’язкові колонки в індексі загорнуто у COALESCE, бо порожні значення у звичайному унікальному індексі не вважаються рівними, і без цього дублікати не відхилялися б. Частковий індекс за (status, scheduled_for) для статусу pending прискорює вибірку листів до надсилання. Атрибути таблиці наведено в таблиці 3.16.
```

## F8. Curly apostrophes in table defaults

Where: `paper.md` line 725 (table 3.14, `status`) and line 755 (table 3.16, `status`).

Why: The real default is `'pending'` with straight quotes. The curly quotes come from Google Docs autocorrect. They read as non-code characters.

Replace `DEFAULT ’pending’` with `DEFAULT 'pending'` in both rows. After pasting into Google Docs, check that the autocorrect did not change the quotes again.

## F9. AssociativeImage to File link in section 2.6.6

Where: `paper.md` line 474, the sentence about `AssociativeImage` and `File`.

Why: The schema has no `UNIQUE` on `associative_images.file_id`, so the database enforces only many-to-one. The code is authoritative. The sentence still keeps the idea that each image has exactly one file. Check that diagram 2.7 draws this link as many-to-one too.

Current text:

```
Сутність “Асоціативне зображення” звʼязком “один до одного” посилається на сутність “Файл”, оскільки кожне асоціативне зображення зберігається як рівно один завантажений файл.
```

Replace with:

```
Сутність “Асоціативне зображення” звʼязком “багато до одного” посилається на сутність “Файл”, оскільки кожне асоціативне зображення зберігається як рівно один завантажений файл.
```

## F10. Placeholders

Where: `paper.md` lines 526-530.

Why: Section 3.3 body says `*todo*`, and the heading says `3.3.XX`. I cannot choose the number, because the other subsections of 3.3 are not written. When they are done, set the number and add a short lead-in for 3.3. This is an open item, and I drafted no text for it.

## F11. Error text in the code (not edited)

Where: `backend/src/features/attachments/services.ts` line 354.

Why: The message says "Impression has a psychologist completion and cannot be deleted." Only the client writes a completion, so "psychologist" is wrong. It is probably the source of the error in F1. You did not ask for a code change, so I changed nothing. If you want it, the message becomes "Impression has a client completion and cannot be deleted."
