# Додаток П — Фізична модель бази даних

Фізична модель БД у СКБД PostgreSQL (PSM). Формат: таблиці з повними назвами колонок, типами PostgreSQL, значеннями за замовчуванням та обмеженнями; зв'язки — «вороняча лапка» (crow's foot) з кардинальностями, як у додатку М. Відмінність від логічної моделі (додаток М): конкретні типи СКБД, DEFAULT-вирази, індекси (зокрема частковий і унікальний за виразами), тригер, розширення та службові таблиці бібліотеки автентифікації показані ПОВНІСТЮ.

Позначки: PK, FK, NN = NOT NULL, U = UNIQUE, D = DEFAULT. Каскади: усі FK з ON DELETE CASCADE, якщо не вказано інше.

Розширення: `pgcrypto` (генерація UUID через `gen_random_uuid()`).

## Таблиці better-auth (створює бібліотека; імена колонок у camelCase)

**"user"** — id text PK; name text NN; email text NN U; emailVerified boolean NN; image text; createdAt timestamptz NN; updatedAt timestamptz NN; active_role text CHECK IN('psycho','client') D NULL ← єдина колонка, додана міграцією проєкту.

**session** — id text PK; token text NN U; userId text NN FK→"user"(id); expiresAt timestamptz NN; ipAddress text; userAgent text; createdAt NN; updatedAt NN.

**account** — id text PK; userId text NN FK→"user"(id); providerId text NN ('google'); accountId text NN; accessToken text; refreshToken text; idToken text; accessTokenExpiresAt timestamptz; refreshTokenExpiresAt timestamptz; scope text; password text (не використовується); createdAt NN; updatedAt NN. Примітка на діаграмі: тут зберігаються OAuth-токени Google, які сервер використовує для Google Calendar API.

**verification** — id text PK; identifier text NN; value text NN; expiresAt timestamptz NN; createdAt; updatedAt.

## Тригер

На "user": `AFTER INSERT FOR EACH ROW EXECUTE FUNCTION ensure_user_role_rows()` — функція plpgsql, що вставляє рядки у `clients` і `psychologists` (`ON CONFLICT DO NOTHING`). Показати як примітку біля "user" зі стрілками до clients і psychologists.

## Прикладні таблиці

**clients** — user_id text PK, FK→"user"(id) ON DELETE/UPDATE CASCADE; username text; phone text; telegram text; instagram text.

**psychologists** — user_id text PK, FK→"user"(id) ON DELETE/UPDATE CASCADE.

**psychologist_clients** — PK (client_id, psycho_id); client_id text FK→"user"(id); psycho_id text FK→"user"(id); disconnected_at timestamptz D NULL.

**appointments** — id text PK D gen_random_uuid(); psycho_id text NN FK→"user"(id); client_id text NN FK→"user"(id); start_time timestamptz NN; end_time timestamptz NN; started_at timestamptz D NULL; ended_at timestamptz D NULL; google_meet_link text D NULL; google_calendar_event_id text D NULL; whiteboard_elements jsonb D NULL; whiteboard_files jsonb D NULL; whiteboard_snapshot_url text D NULL; created_at timestamptz NN D NOW(). Індекс btree (psycho_id, client_id). Колонки статусу НЕМАЄ — стан обчислюється у запитах.

**files** — id text PK D gen_random_uuid(); original_name text NN; stored_name text NN U; mime_type text NN; size bigint NN; uploaded_by text NN FK→"user"(id); created_at timestamptz NN D NOW().

**attachments** — id text PK D gen_random_uuid(); appointment_id text NN FK→appointments(id); author_id text NN FK→"user"(id); type text NN CHECK IN('note','impression','recommendation'); name text NN; text text; created_at timestamptz NN D NOW(); updated_at timestamptz NN D NOW(). Індекси: (appointment_id, type), (author_id).

**attachment_files** — id text PK D gen_random_uuid(); attachment_id text NN FK→attachments(id); file_id text NN FK→files(id); file_type text NN CHECK IN('image','audio'); position integer NN D 0; created_at timestamptz NN D NOW(). Індекс (attachment_id).

**recommendation_reactions** — attachment_id text PK, FK→attachments(id); done boolean NN D false; client_comment text D NULL; psychologist_reply text D NULL; updated_at timestamptz NN D NOW().

**impression_completions** — attachment_id text PK, FK→attachments(id); client_response text NN; created_at timestamptz NN D NOW().

**invitations** — id text PK D gen_random_uuid()::text; psychologist_id text NN FK→"user"(id); invited_email text NN; token text NN U D gen_random_uuid()::text; status text NN D 'pending'; created_at timestamptz NN D now(). Індекси: (token), (psychologist_id), (invited_email).

**associative_images** — id text PK D gen_random_uuid()::text; psychologist_id text NN FK→"user"(id); name text NN; file_id text NN FK→files(id) БЕЗ каскаду (RESTRICT); created_at timestamptz NN D now(); updated_at timestamptz NN D now(). Індекс (psychologist_id).

**email_outbox** — id text PK D gen_random_uuid(); type text NN; variant text D NULL; recipient_user_id text NN FK→"user"(id); appointment_id text FK→appointments(id) D NULL; attachment_id text FK→attachments(id) D NULL; status text NN D 'pending'; attempts integer NN D 0; last_error text; scheduled_for timestamptz NN D NOW(); created_at timestamptz NN D NOW(); sent_at timestamptz.
Індекси: УНІКАЛЬНИЙ за виразами `(type, COALESCE(appointment_id,''), COALESCE(attachment_id,''), recipient_user_id, COALESCE(variant,''))` — дедуплікація/ідемпотентність; ЧАСТКОВИЙ `(status, scheduled_for) WHERE status = 'pending'` — вибірка черги відправником.

## Службова таблиця міграцій

**schema_migrations** — name varchar(255) PK; applied_at timestamptz D CURRENT_TIMESTAMP. Зв'язків з іншими таблицями не має; розмістити окремо в кутку діаграми.

## Зв'язки (кардинальності — як у додатку М)

- "user" 1—1 clients; "user" 1—1 psychologists (PK=FK)
- "user" 1—N session; "user" 1—N account
- "user" 1—N psychologist_clients (двічі: client_id, psycho_id)
- "user" 1—N appointments (двічі: psycho_id, client_id)
- "user" 1—N files (uploaded_by); "user" 1—N attachments (author_id); "user" 1—N invitations; "user" 1—N associative_images; "user" 1—N email_outbox
- appointments 1—N attachments; appointments 1—N email_outbox (nullable FK)
- attachments 1—N attachment_files; files 1—N attachment_files
- attachments 1—1 recommendation_reactions; attachments 1—1 impression_completions; attachments 1—N email_outbox (nullable FK)
- files 1—N associative_images (RESTRICT)

Нічого поза переліченим не додавати.
