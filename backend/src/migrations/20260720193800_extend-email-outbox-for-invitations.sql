-- Generalize email_outbox beyond appointment/attachment emails: allow raw-email
-- recipients (invitations have no user row yet) and reference invitations.

ALTER TABLE email_outbox ALTER COLUMN recipient_user_id DROP NOT NULL;

ALTER TABLE email_outbox ADD COLUMN recipient_email TEXT;

ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_recipient_present
    CHECK (recipient_user_id IS NOT NULL OR recipient_email IS NOT NULL);

ALTER TABLE email_outbox ADD COLUMN invitation_id TEXT
    REFERENCES invitations(id) ON DELETE CASCADE;

DROP INDEX email_outbox_dedup;

CREATE UNIQUE INDEX email_outbox_dedup ON email_outbox (
    type,
    COALESCE(appointment_id, ''),
    COALESCE(attachment_id, ''),
    COALESCE(invitation_id, ''),
    COALESCE(recipient_user_id, ''),
    COALESCE(recipient_email, ''),
    COALESCE(variant, '')
);
