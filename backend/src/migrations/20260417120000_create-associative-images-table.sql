CREATE TABLE associative_images (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    psychologist_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_id TEXT NOT NULL REFERENCES files(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_associative_images_psychologist ON associative_images(psychologist_id);
