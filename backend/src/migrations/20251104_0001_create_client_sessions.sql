-- Enable UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create table for client sessions
CREATE TABLE client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  google_meet_link TEXT NULL,
  description TEXT NULL,
  duration_min INTEGER NULL,
  is_finished BOOLEAN NOT NULL DEFAULT FALSE,
  notes_count INTEGER NOT NULL DEFAULT 0,
  recommendations_count INTEGER NOT NULL DEFAULT 0,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_client_sessions_duration CHECK (duration_min IS NULL OR duration_min BETWEEN 1 AND 480)
);

CREATE INDEX idx_client_sessions_client_date
  ON client_sessions (client_id, scheduled_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_client_sessions_updated_at
BEFORE UPDATE ON client_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
