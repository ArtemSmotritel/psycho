CREATE TABLE attachment_files (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id TEXT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    file_id       TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_type     TEXT NOT NULL CHECK (file_type IN ('image', 'audio')),
    position      INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON attachment_files (attachment_id);

-- Migrate existing image_urls → attachment_files rows
INSERT INTO attachment_files (attachment_id, file_id, file_type, position)
SELECT
    a.id                      AS attachment_id,
    f.id                      AS file_id,
    'image'                   AS file_type,
    (u.ordinality - 1)        AS position
FROM attachments a
CROSS JOIN LATERAL unnest(a.image_urls) WITH ORDINALITY AS u(url, ordinality)
JOIN files f ON f.stored_name = split_part(u.url, '/api/files/', 2);

-- Migrate existing audio_urls → attachment_files rows
INSERT INTO attachment_files (attachment_id, file_id, file_type, position)
SELECT
    a.id                      AS attachment_id,
    f.id                      AS file_id,
    'audio'                   AS file_type,
    (u.ordinality - 1)        AS position
FROM attachments a
CROSS JOIN LATERAL unnest(a.audio_urls) WITH ORDINALITY AS u(url, ordinality)
JOIN files f ON f.stored_name = split_part(u.url, '/api/files/', 2);

ALTER TABLE attachments DROP COLUMN image_urls;
ALTER TABLE attachments DROP COLUMN audio_urls;
