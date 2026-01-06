BEGIN;

-- Categories master data
CREATE TABLE IF NOT EXISTS category (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
	amount NUMERIC(14,2) NOT NULL DEFAULT 0,
	repeats BOOLEAN NOT NULL DEFAULT FALSE,
	description TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_name_lower ON category (LOWER(name));

-- Monthly budget container
CREATE TABLE IF NOT EXISTS budget (
	id BIGSERIAL PRIMARY KEY,
	month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
	year INT NOT NULL CHECK (year >= 2000),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (month, year)
);

-- Budget allocations per category
CREATE TABLE IF NOT EXISTS budget_item (
	id BIGSERIAL PRIMARY KEY,
	budget_id BIGINT NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
	category_id BIGINT NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
	amount NUMERIC(14,2) NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (budget_id, category_id)
);

-- Seed default Uncategorized category used when deleting other categories
INSERT INTO category (name, type, amount, repeats, description)
VALUES ('Uncategorized', 'expense', 0, FALSE, 'Default category for uncategorized items')
ON CONFLICT (LOWER(name)) DO NOTHING;

COMMIT;
