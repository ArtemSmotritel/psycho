# Додаток Л — Інфологічна (концептуальна) модель бази даних

ER-діаграма рівня сутностей: намалювати кожну сутність як прямокутник із переліком атрибутів. Ключові атрибути підкреслити. Зв’язки на концептуальній моделі можна показати простими лініями без кардинальностей і без зовнішніх ключів (акцент — на сутностях та атрибутах). Кардинальності й ключі — на даталогічній моделі (додаток М).

## Сутності та атрибути

**User** (Користувач): _id_, name, email, email_verified, image, active_role, created_at, updated_at

**Psychologist** (Психолог): _user_id_

**Client** (Клієнт): _user_id_, username, phone, telegram, instagram

**PsychologistClient** (Зв’язок психолог–клієнт): _psycho_id_, _client_id_, disconnected_at

**Appointment** (Сесія): _id_, psycho_id, client_id, start_time, end_time, started_at, ended_at, google_meet_link, google_calendar_event_id, whiteboard_elements, whiteboard_files, whiteboard_snapshot_url, created_at
> Примітка: стан сесії (майбутня/активна/завершена/попередження/пропущена) не зберігається, а обчислюється застосунком — на діаграмі його не показувати як атрибут.

**Attachment** (Вкладення): _id_, appointment_id, author_id, type {note | impression | recommendation}, name, text, created_at, updated_at

**File** (Файл): _id_, original_name, stored_name, mime_type, size, uploaded_by, created_at

**AttachmentFile** (Файл вкладення): _id_, attachment_id, file_id, file_type {image | audio}, position, created_at

**RecommendationReaction** (Реакція на рекомендацію): _attachment_id_, done, client_comment, psychologist_reply, updated_at

**ImpressionCompletion** (Виконання враження): _attachment_id_, client_response, created_at

**Invitation** (Запрошення): _id_, psychologist_id, invited_email, token, status {pending | accepted}, created_at

**AssociativeImage** (Асоціативне зображення): _id_, psychologist_id, name, file_id, created_at, updated_at

**EmailOutbox** (Лист-нагадування): _id_, type {session_reminder | rec_reminder | rec_created}, variant {24h | 1h | 2d | 1d | —}, recipient_user_id, appointment_id, attachment_id, status {pending | sent | failed | skipped}, attempts, last_error, scheduled_for, created_at, sent_at

Групування для наочності (за бажанням): «Користувачі та ролі» (User, Psychologist, Client, PsychologistClient), «Сесії» (Appointment), «Вкладення та медіа» (Attachment, File, AttachmentFile, RecommendationReaction, ImpressionCompletion), «Онбординг і матеріали» (Invitation, AssociativeImage), «Сповіщення» (EmailOutbox).
