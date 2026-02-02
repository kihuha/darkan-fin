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
		(2, 'Food and Hosting', 'expense', 25000, TRUE, NULL),
		(2, 'Rent', 'expense', 52500, TRUE, NULL),
		(2, 'Electricity', 'expense', 2500, TRUE, NULL),
		(2, 'Water', 'expense', 1500, TRUE, NULL),
		(2, 'Internet', 'expense', 4100, TRUE, NULL),
		(2, 'Transport', 'expense', 0, FALSE, NULL),
		(2, 'Cleaning Lady', 'expense', 0, FALSE, NULL),
		(2, 'Super Date', 'expense', 15000, TRUE, NULL),
		(2, 'Darius'' Allowance', 'expense', 18000, TRUE, NULL),
		(2, 'Winnie Allowance', 'expense', 20000, TRUE, NULL),
		(2, 'Streaming', 'expense', 1100, TRUE, NULL),
		(2, 'Darius'' Tithe', 'expense', 0, FALSE, NULL),
		(2, 'Winnie Tithe', 'expense', 0, FALSE, NULL),
		(2, 'Mama in Love Allowance', 'expense', 0, FALSE, NULL),
		(2, 'Moneyback', 'expense', 17200, TRUE, NULL),
		(2, 'Education', 'expense', 0, FALSE, NULL)
	ON CONFLICT (family_id, LOWER(name)) DO NOTHING;
END $$;

COMMIT;
