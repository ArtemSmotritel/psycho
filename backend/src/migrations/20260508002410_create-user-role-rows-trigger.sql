CREATE OR REPLACE FUNCTION ensure_user_role_rows() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO clients (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO psychologists (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_role_rows
    AFTER INSERT ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_role_rows();

INSERT INTO clients (user_id)
SELECT id FROM "user"
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO psychologists (user_id)
SELECT id FROM "user"
ON CONFLICT (user_id) DO NOTHING;
