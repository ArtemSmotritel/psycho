ALTER TABLE "user"
ADD COLUMN active_role TEXT CHECK (active_role IN ('psycho', 'client')) DEFAULT NULL;
