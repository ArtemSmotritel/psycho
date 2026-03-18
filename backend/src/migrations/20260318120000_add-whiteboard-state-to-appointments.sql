ALTER TABLE appointments
    ADD COLUMN whiteboard_elements JSONB DEFAULT NULL,
    ADD COLUMN whiteboard_files JSONB DEFAULT NULL;
