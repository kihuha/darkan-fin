BEGIN;

-- =========================
-- Family
-- =========================
CREATE TABLE IF NOT EXISTS family (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(100),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Family Members
-- =========================
CREATE TABLE IF NOT EXISTS family_member (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	role VARCHAR(20) NOT NULL DEFAULT 'admin'
		CHECK (role IN ('admin', 'member')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (family_id, user_id),
	UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_member_user_id ON family_member (user_id);
CREATE INDEX IF NOT EXISTS idx_family_member_family_id ON family_member (family_id);

-- =========================
-- Family Invites
-- =========================
CREATE TABLE IF NOT EXISTS family_invite (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	email TEXT NOT NULL,
	token_hash TEXT NOT NULL,
	invited_by_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	status VARCHAR(20) NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
	expires_at TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invite_family_id ON family_invite (family_id);
CREATE INDEX IF NOT EXISTS idx_family_invite_email ON family_invite (LOWER(email));

-- =========================
-- Categories
-- =========================
CREATE TABLE IF NOT EXISTS category (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	name VARCHAR(100) NOT NULL,
	type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
	amount NUMERIC(14,2) NOT NULL DEFAULT 0,
	repeats BOOLEAN NOT NULL DEFAULT FALSE,
	description TEXT,
	tags TEXT[] NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (id, family_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_family_name_lower
	ON category (family_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_category_family_id ON category (family_id);

-- =========================
-- Budgets
-- =========================
CREATE TABLE IF NOT EXISTS budget (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
	year INT NOT NULL CHECK (year >= 2000),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (family_id, month, year),
	UNIQUE (id, family_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_family_id ON budget (family_id);

-- =========================
-- Budget Items
-- =========================
CREATE TABLE IF NOT EXISTS budget_item (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	budget_id BIGINT NOT NULL,
	category_id BIGINT NOT NULL,
	amount NUMERIC(14,2) NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (budget_id, category_id),
	FOREIGN KEY (budget_id, family_id)
		REFERENCES budget(id, family_id) ON DELETE CASCADE,
	FOREIGN KEY (category_id, family_id)
		REFERENCES category(id, family_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_budget_item_family_id ON budget_item (family_id);

-- =========================
-- Transactions
-- =========================
CREATE TABLE IF NOT EXISTS transaction (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	category_id BIGINT NOT NULL,
	user_id VARCHAR(255) NOT NULL,
	amount NUMERIC(14,2) NOT NULL,
	transaction_date DATE NOT NULL,
	description TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	FOREIGN KEY (category_id, family_id)
		REFERENCES category(id, family_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transaction_family_id ON transaction (family_id);
CREATE INDEX IF NOT EXISTS idx_transaction_family_date ON transaction (family_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_family_category ON transaction (family_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_family_user ON transaction (family_id, user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_user_date ON transaction (user_id, transaction_date DESC);

-- =========================
-- Seed Default Category
-- =========================
INSERT INTO category (family_id, name, type, amount, repeats, description)
SELECT f.id, 'Uncategorized', 'expense', 0, FALSE, 'Default category for uncategorized items'
FROM family f
ON CONFLICT (family_id, LOWER(name)) DO NOTHING;

COMMIT;

BEGIN;

-- Get or create the default family
DO $$
DECLARE
	default_family_id BIGINT;
BEGIN
	-- Get the first family (should be 'Default Family' from migration)
	SELECT id INTO default_family_id
	FROM family
	ORDER BY id ASC
	LIMIT 1;

	-- If no family exists, create one
	IF default_family_id IS NULL THEN
		INSERT INTO family (name)
		VALUES ('Njihia''s Family')
		RETURNING id INTO default_family_id;
	END IF;

	-- Seed income categories
	INSERT INTO category (family_id, name, type, amount, repeats, description)
	VALUES
		(default_family_id, 'Darius'' Salary', 'income', 0, FALSE, NULL),
		(default_family_id, 'Winnie Salary', 'income', 0, FALSE, NULL),
		(default_family_id, 'Rongai Rent', 'income', 0, FALSE, NULL)
	ON CONFLICT (family_id, LOWER(name)) DO NOTHING;

	-- Seed expense categories
	INSERT INTO category (family_id, name, type, amount, repeats, description)
	VALUES
		(default_family_id, 'Food and Hosting', 'expense', 25000, TRUE, NULL),
		(default_family_id, 'Rent', 'expense', 30000, TRUE, NULL),
		(default_family_id, 'Electricity', 'expense', 2500, TRUE, NULL),
		(default_family_id, 'Water', 'expense', 1500, TRUE, NULL),
		(default_family_id, 'Internet', 'expense', 4100, TRUE, NULL),
		(default_family_id, 'Transport', 'expense', 0, FALSE, NULL),
		(default_family_id, 'Streaming', 'expense', 1100, TRUE, NULL),
		(default_family_id, 'Education', 'expense', 0, FALSE, NULL)
	ON CONFLICT (family_id, LOWER(name)) DO NOTHING;
END $$;

COMMIT;

BEGIN;

-- Family-scoped budget queries by month/year
CREATE INDEX IF NOT EXISTS idx_budget_family_year_month
	ON budget (family_id, year, month);

-- Keep only one active invite per family/email pair.
CREATE UNIQUE INDEX IF NOT EXISTS uq_family_invite_pending_email
	ON family_invite (family_id, LOWER(email))
	WHERE status = 'pending';

-- Existing checklist indexes (kept idempotent).
CREATE INDEX IF NOT EXISTS idx_transaction_family_date
	ON transaction (family_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_family_category
	ON transaction (family_id, category_id);

CREATE INDEX IF NOT EXISTS idx_category_family_id
	ON category (family_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_family_member_family_user
	ON family_member (family_id, user_id);

COMMIT;
