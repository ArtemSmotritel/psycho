CREATE TABLE recommendation_reactions (
    attachment_id      TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
    done               BOOLEAN NOT NULL DEFAULT false,
    client_comment     TEXT DEFAULT NULL,
    psychologist_reply TEXT DEFAULT NULL,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
