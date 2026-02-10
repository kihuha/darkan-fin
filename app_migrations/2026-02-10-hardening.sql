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
