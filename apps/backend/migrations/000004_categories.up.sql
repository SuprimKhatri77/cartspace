CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE
    SET
        NULL CHECK (id != parent_id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX categories_parent_idx ON categories(parent_id);

CREATE TRIGGER categories_updated_at BEFORE
UPDATE
    ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();