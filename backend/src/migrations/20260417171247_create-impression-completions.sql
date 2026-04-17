CREATE TABLE impression_completions (
    attachment_id    TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
    client_response  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
