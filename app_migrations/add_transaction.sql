BEGIN;

-- Transaction table to store all payments made by users
CREATE TABLE IF NOT EXISTS transaction (
	id BIGSERIAL PRIMARY KEY,
	category_id BIGINT NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
	user_id VARCHAR(255) NOT NULL,
	amount NUMERIC(14,2) NOT NULL,
	transaction_date DATE NOT NULL,
	description TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_transaction_user_id ON transaction (user_id);

-- Index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_transaction_category_id ON transaction (category_id);

-- Index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_transaction_date ON transaction (transaction_date);

-- Index for composite queries (user + date)
CREATE INDEX IF NOT EXISTS idx_transaction_user_date ON transaction (user_id, transaction_date DESC);

COMMIT;
