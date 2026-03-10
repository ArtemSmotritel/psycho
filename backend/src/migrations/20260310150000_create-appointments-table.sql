CREATE TABLE appointments (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  psycho_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming', 'active', 'past')),
  google_meet_link TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON appointments (psycho_id, client_id);
