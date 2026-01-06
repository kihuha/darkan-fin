BEGIN;

-- Seed income categories
INSERT INTO category (name, type, amount, repeats, description)
VALUES
	('Darius'' Salary', 'income', 0, FALSE, NULL),
	('Winnie Salary', 'income', 0, FALSE, NULL),
	('Rongai Rent', 'income', 0, FALSE, NULL)
ON CONFLICT (LOWER(name)) DO NOTHING;

-- Seed expense categories
INSERT INTO category (name, type, amount, repeats, description)
VALUES
	('Food and Hosting', 'expense', 25000, TRUE, NULL),
	('Rent', 'expense', 52500, TRUE, NULL),
	('Electricity', 'expense', 2500, TRUE, NULL),
	('Water', 'expense', 1500, TRUE, NULL),
	('Internet', 'expense', 4100, TRUE, NULL),
	('Transport', 'expense', 0, FALSE, NULL),
	('Cleaning Lady', 'expense', 0, FALSE, NULL),
	('Super Date', 'expense', 15000, TRUE, NULL),
	('Darius'' Allowance', 'expense', 18000, TRUE, NULL),
	('Winnie Allowance', 'expense', 20000, TRUE, NULL),
	('Streaming', 'expense', 1100, TRUE, NULL),
	('Darius'' Tithe', 'expense', 0, FALSE, NULL),
	('Winnie Tithe', 'expense', 0, FALSE, NULL),
	('Mama in Love Allowance', 'expense', 0, FALSE, NULL),
	('Moneyback', 'expense', 17200, TRUE, NULL),
	('Education', 'expense', 0, FALSE, NULL)
ON CONFLICT (LOWER(name)) DO NOTHING;

COMMIT;
