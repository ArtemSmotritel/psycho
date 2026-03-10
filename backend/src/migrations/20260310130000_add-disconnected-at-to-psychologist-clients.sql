ALTER TABLE psychologist_clients
    ADD COLUMN disconnected_at TIMESTAMPTZ DEFAULT NULL;
