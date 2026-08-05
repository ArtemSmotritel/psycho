# Додаток М — Даталогічна (логічна) модель бази даних

Логічна модель: таблиці з колонками, типами й обмеженнями; зв’язки — лініями «вороняча лапка» (crow’s foot) з кардинальностями. PK = первинний ключ, FK = зовнішній ключ. Тип `text` для ідентифікаторів (UUID/рядкові id better-auth). Позначки: NN = NOT NULL, U = UNIQUE, D = DEFAULT.

## Таблиці

**user** — PK id(text). name NN, email NN U, email_verified bool NN, image, active_role text CHECK IN(psycho,client), created_at NN, updated_at NN.

**psychologists** — PK user_id(text) → FK user(id) ON DELETE CASCADE / ON UPDATE CASCADE.

**clients** — PK user_id(text) → FK user(id) ON DELETE/UPDATE CASCADE. username, phone, telegram, instagram (усі nullable).

**psychologist_clients** — PK (client_id, psycho_id). client_id → FK user(id) CASCADE; psycho_id → FK user(id) CASCADE. disconnected_at timestamptz (NULL = активний).

**appointments** — PK id(text) D gen_random_uuid(). psycho_id text NN → FK user(id) CASCADE; client_id text NN → FK user(id) CASCADE. start_time NN, end_time NN, started_at, ended_at, google_meet_link, google_calendar_event_id, whiteboard_elements jsonb, whiteboard_files jsonb, whiteboard_snapshot_url, created_at NN. Індекс (psycho_id, client_id).

**files** — PK id(text) D uuid. original_name NN, stored_name NN U, mime_type NN, size bigint NN, uploaded_by text NN → FK user(id) CASCADE, created_at NN.

**attachments** — PK id(text) D uuid. appointment_id text NN → FK appointments(id) CASCADE; author_id text NN → FK user(id) CASCADE. type text NN CHECK IN(note,impression,recommendation). name NN, text (nullable), created_at NN, updated_at NN. Індекси (appointment_id, type), (author_id).

**attachment_files** — PK id(text) D uuid. attachment_id text NN → FK attachments(id) CASCADE; file_id text NN → FK files(id) CASCADE. file_type text NN CHECK IN(image,audio). position int NN D 0. created_at NN. Індекс (attachment_id).

**recommendation_reactions** — PK attachment_id(text) → FK attachments(id) CASCADE. done bool NN D false, client_comment, psychologist_reply, updated_at NN.

**impression_completions** — PK attachment_id(text) → FK attachments(id) CASCADE. client_response text NN, created_at NN.

**invitations** — PK id(text) D uuid. psychologist_id text NN → FK user(id) CASCADE. invited_email NN. token text NN U D uuid. status text NN D 'pending'. created_at NN. Індекси token, psychologist_id, invited_email.

**associative_images** — PK id(text) D uuid. psychologist_id text NN → FK user(id) CASCADE. name NN. file_id text NN → FK files(id) (БЕЗ каскаду — RESTRICT). created_at NN, updated_at NN. Індекс (psychologist_id).

**email_outbox** — PK id(text) D uuid. type NN, variant (nullable), recipient_user_id text NN → FK user(id) CASCADE, appointment_id → FK appointments(id) CASCADE (nullable), attachment_id → FK attachments(id) CASCADE (nullable), status NN D 'pending', attempts int NN D 0, last_error, scheduled_for NN, created_at NN, sent_at. Частковий UNIQUE-індекс дедуплікації (type, appointment_id, attachment_id, recipient_user_id, variant).

> Таблиці better-auth `session`, `account`, `verification` пов’язані з `user` (1:N) і керуються бібліотекою автентифікації; на діаграмі їх можна показати спрощено або приміткою.

## Зв’язки та кардинальності
- user 1 — 1 psychologists   (PK=FK)
- user 1 — 1 clients          (PK=FK)
- user 1 — N psychologist_clients (як psycho_id) ; user 1 — N psychologist_clients (як client_id) → разом реалізують N:M «психолог ↔ клієнт»
- user 1 — N appointments (як psycho_id) ; user 1 — N appointments (як client_id)
- appointment 1 — N attachments ; user 1 — N attachments (author_id)
- attachment 1 — N attachment_files ; file 1 — N attachment_files → разом N:M «attachment ↔ file»
- user 1 — N files (uploaded_by)
- attachment 1 — 1 recommendation_reactions ; attachment 1 — 1 impression_completions
- user(психолог) 1 — N invitations
- user(психолог) 1 — N associative_images ; file 1 — N associative_images
- user 1 — N email_outbox ; appointment 1 — N email_outbox (nullable) ; attachment 1 — N email_outbox (nullable)
