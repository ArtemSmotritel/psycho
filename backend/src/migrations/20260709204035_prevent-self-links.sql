-- A user must not be their own client. Remove any existing self-links and
-- self-appointments, then enforce the invariant at the DB level.
DELETE FROM appointments WHERE psycho_id = client_id;

DELETE FROM psychologist_clients WHERE psycho_id = client_id;

ALTER TABLE psychologist_clients
    ADD CONSTRAINT psychologist_clients_no_self CHECK (client_id <> psycho_id);

ALTER TABLE appointments
    ADD CONSTRAINT appointments_no_self CHECK (psycho_id <> client_id);
