BEGIN;

CREATE TABLE IF NOT EXISTS family (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(100) NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_member (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
	role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (family_id, user_id),
	UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_member_user_id ON family_member (user_id);
CREATE INDEX IF NOT EXISTS idx_family_member_family_id ON family_member (family_id);

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

ALTER TABLE category ADD COLUMN IF NOT EXISTS family_id BIGINT;
ALTER TABLE budget ADD COLUMN IF NOT EXISTS family_id BIGINT;
ALTER TABLE budget_item ADD COLUMN IF NOT EXISTS family_id BIGINT;
ALTER TABLE transaction ADD COLUMN IF NOT EXISTS family_id BIGINT;

DO $$
DECLARE
	default_family_id BIGINT;
	first_user_id TEXT;
BEGIN
	SELECT id INTO default_family_id
	FROM family
	ORDER BY id ASC
	LIMIT 1;

	IF default_family_id IS NULL THEN
		INSERT INTO family (name)
		VALUES ('Default Family')
		RETURNING id INTO default_family_id;
	END IF;

	UPDATE category SET family_id = default_family_id WHERE family_id IS NULL;
	UPDATE budget SET family_id = default_family_id WHERE family_id IS NULL;
	UPDATE budget_item SET family_id = default_family_id WHERE family_id IS NULL;
	UPDATE transaction SET family_id = default_family_id WHERE family_id IS NULL;

	SELECT id INTO first_user_id
	FROM "user"
	ORDER BY "createdAt" ASC
	LIMIT 1;

	IF first_user_id IS NOT NULL THEN
		INSERT INTO family_member (family_id, user_id, role)
		VALUES (default_family_id, first_user_id, 'admin')
		ON CONFLICT (user_id) DO NOTHING;
	END IF;
END $$;

ALTER TABLE category ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE budget ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE budget_item ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE transaction ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE category DROP CONSTRAINT IF EXISTS category_family_id_fkey;
ALTER TABLE category ADD CONSTRAINT category_family_id_fkey
	FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS uq_category_name_lower;
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_family_name_lower
	ON category (family_id, LOWER(name));

ALTER TABLE category DROP CONSTRAINT IF EXISTS category_id_family_unique;
ALTER TABLE category ADD CONSTRAINT category_id_family_unique UNIQUE (id, family_id);
CREATE INDEX IF NOT EXISTS idx_category_family_id ON category (family_id);

ALTER TABLE budget DROP CONSTRAINT IF EXISTS budget_month_year_key;
ALTER TABLE budget DROP CONSTRAINT IF EXISTS budget_family_id_fkey;
ALTER TABLE budget ADD CONSTRAINT budget_family_id_fkey
	FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE;
ALTER TABLE budget ADD CONSTRAINT budget_family_month_year_key
	UNIQUE (family_id, month, year);

ALTER TABLE budget DROP CONSTRAINT IF EXISTS budget_id_family_unique;
ALTER TABLE budget ADD CONSTRAINT budget_id_family_unique UNIQUE (id, family_id);
CREATE INDEX IF NOT EXISTS idx_budget_family_id ON budget (family_id);

ALTER TABLE budget_item DROP CONSTRAINT IF EXISTS budget_item_budget_id_fkey;
ALTER TABLE budget_item DROP CONSTRAINT IF EXISTS budget_item_category_id_fkey;
ALTER TABLE budget_item DROP CONSTRAINT IF EXISTS budget_item_budget_family_fkey;
ALTER TABLE budget_item DROP CONSTRAINT IF EXISTS budget_item_category_family_fkey;
ALTER TABLE budget_item DROP CONSTRAINT IF EXISTS budget_item_family_id_fkey;
ALTER TABLE budget_item ADD CONSTRAINT budget_item_budget_family_fkey
	FOREIGN KEY (budget_id, family_id) REFERENCES budget(id, family_id) ON DELETE CASCADE;
ALTER TABLE budget_item ADD CONSTRAINT budget_item_category_family_fkey
	FOREIGN KEY (category_id, family_id) REFERENCES category(id, family_id) ON DELETE RESTRICT;
ALTER TABLE budget_item ADD CONSTRAINT budget_item_family_id_fkey
	FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_budget_item_family_id ON budget_item (family_id);

ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_family_id_fkey;
ALTER TABLE transaction ADD CONSTRAINT transaction_family_id_fkey
	FOREIGN KEY (family_id) REFERENCES family(id) ON DELETE CASCADE;
ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_category_id_fkey;
ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_category_family_fkey;
ALTER TABLE transaction ADD CONSTRAINT transaction_category_family_fkey
	FOREIGN KEY (category_id, family_id) REFERENCES category(id, family_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_transaction_family_id ON transaction (family_id);
CREATE INDEX IF NOT EXISTS idx_transaction_family_date ON transaction (family_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_family_category ON transaction (family_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_family_user ON transaction (family_id, user_id);

COMMIT;
