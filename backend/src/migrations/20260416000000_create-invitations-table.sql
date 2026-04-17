CREATE TABLE invitations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    psychologist_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_psychologist_id ON invitations(psychologist_id);
CREATE INDEX idx_invitations_invited_email ON invitations(invited_email);
