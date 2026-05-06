UPDATE attachments
SET name = 'Session impression ' || TO_CHAR(a.start_time, 'DD:HH')
FROM appointments a
WHERE a.id = attachments.appointment_id
  AND attachments.name IS NULL;

ALTER TABLE attachments ALTER COLUMN name SET NOT NULL;
