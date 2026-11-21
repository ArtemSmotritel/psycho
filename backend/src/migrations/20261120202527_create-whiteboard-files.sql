-- Whiteboard images move out of the appointments row. Each file is written once
-- (file ids identify immutable content), so a repeated save only rewrites the elements.
CREATE TABLE whiteboard_files (
    appointment_id TEXT NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
    file_id        TEXT NOT NULL,
    -- JSON text of the Excalidraw file object. Base64 images do not compress,
    -- so skip the TOAST compression attempt.
    data           TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (appointment_id, file_id)
);

ALTER TABLE whiteboard_files ALTER COLUMN data SET STORAGE EXTERNAL;

INSERT INTO whiteboard_files (appointment_id, file_id, data)
SELECT a.id, f.key, f.value::text
FROM appointments a, jsonb_each(a.whiteboard_files) AS f
WHERE a.whiteboard_files IS NOT NULL
  AND jsonb_typeof(a.whiteboard_files) = 'object';

ALTER TABLE appointments DROP COLUMN whiteboard_files;
