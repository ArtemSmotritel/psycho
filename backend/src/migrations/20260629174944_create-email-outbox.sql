CREATE TABLE email_outbox (
    id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    type              TEXT NOT NULL,              -- 'session_reminder' | 'rec_reminder' | 'rec_created'
    variant           TEXT,                       -- '24h'|'1h'|'2d'|'1d' | NULL for rec_created
    recipient_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    appointment_id    TEXT REFERENCES appointments(id) ON DELETE CASCADE,
    attachment_id     TEXT REFERENCES attachments(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'sent'|'failed'|'skipped'
    attempts          INT  NOT NULL DEFAULT 0,
    last_error        TEXT,
    scheduled_for     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at           TIMESTAMPTZ
);

-- idempotency: NULLs don't collide in a plain UNIQUE, so COALESCE the nullables
CREATE UNIQUE INDEX email_outbox_dedup ON email_outbox (
    type,
    COALESCE(appointment_id, ''),
    COALESCE(attachment_id, ''),
    recipient_user_id,
    COALESCE(variant, '')
);

CREATE INDEX email_outbox_pending ON email_outbox (status, scheduled_for)
    WHERE status = 'pending';
