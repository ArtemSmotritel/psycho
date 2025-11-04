-- Enable UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create table for client sessions
CREATE TABLE IF NOT EXISTS "client-sessions" (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index to query sessions by client and date
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_date
  ON "client-sessions" (client_id, scheduled_at DESC);

-- Keep DB self-validating: duration must be between 1 and 480 minutes when present
ALTER TABLE "client-sessions"
  ADD CONSTRAINT IF NOT EXISTS chk_client_sessions_duration
  CHECK (duration_min IS NULL OR duration_min BETWEEN 1 AND 480);
