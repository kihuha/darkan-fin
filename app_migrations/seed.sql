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
		(default_family_id, 'Rent', 'expense', 52500, TRUE, NULL),
		(default_family_id, 'Electricity', 'expense', 2500, TRUE, NULL),
		(default_family_id, 'Water', 'expense', 1500, TRUE, NULL),
		(default_family_id, 'Internet', 'expense', 4100, TRUE, NULL),
		(default_family_id, 'Transport', 'expense', 0, FALSE, NULL),
		(default_family_id, 'Cleaning Lady', 'expense', 0, FALSE, NULL),
		(default_family_id, 'Super Date', 'expense', 15000, TRUE, NULL),
		(default_family_id, 'Darius'' Allowance', 'expense', 18000, TRUE, NULL),
		(default_family_id, 'Winnie Allowance', 'expense', 20000, TRUE, NULL),
		(default_family_id, 'Streaming', 'expense', 1100, TRUE, NULL),
		(default_family_id, 'Darius'' Tithe', 'expense', 0, FALSE, NULL),
		(default_family_id, 'Winnie Tithe', 'expense', 0, FALSE, NULL),
		(default_family_id, 'Mama in Love Allowance', 'expense', 0, FALSE, NULL),
		(default_family_id, 'Moneyback', 'expense', 17200, TRUE, NULL),
		(default_family_id, 'Education', 'expense', 0, FALSE, NULL)
	ON CONFLICT (family_id, LOWER(name)) DO NOTHING;
END $$;

COMMIT;
