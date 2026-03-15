CREATE TABLE attachments (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    author_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN ('note', 'impression', 'recommendation')),
    name           TEXT,
    text           TEXT,
    image_urls     TEXT[] NOT NULL DEFAULT '{}',
    audio_urls     TEXT[] NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON attachments (appointment_id, type);
CREATE INDEX ON attachments (author_id);
