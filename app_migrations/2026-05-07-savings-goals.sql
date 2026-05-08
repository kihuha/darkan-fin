BEGIN;

-- =========================
-- Savings Goals
-- =========================
CREATE TABLE IF NOT EXISTS savings_goal (
	id BIGSERIAL PRIMARY KEY,
	family_id BIGINT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
	created_by_user_id VARCHAR(255) NOT NULL,
	name VARCHAR(150) NOT NULL,
	target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
	target_date DATE NOT NULL,
	notes TEXT,
	is_primary BOOLEAN NOT NULL DEFAULT FALSE,
	archived_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (id, family_id)
);

CREATE INDEX IF NOT EXISTS idx_savings_goal_family_id
	ON savings_goal (family_id);

CREATE INDEX IF NOT EXISTS idx_savings_goal_family_active
	ON savings_goal (family_id, archived_at);

-- Only one active primary goal per family.
CREATE UNIQUE INDEX IF NOT EXISTS uq_savings_goal_primary_per_family
	ON savings_goal (family_id)
	WHERE is_primary = TRUE AND archived_at IS NULL;

COMMIT;
