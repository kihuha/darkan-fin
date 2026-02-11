export const mockBudgetData = {
  success: true,
  data: {
    id: "5",
    month: 2,
    year: 2026,
    created_at: "2026-02-10T02:02:12.379Z",
    updated_at: "2026-02-10T02:02:12.379Z",
    categories: [
      {
        category_id: "1",
        category_name: "Groceries",
        category_type: "expense",
        category_amount: 500,
        repeats: true,
        amount: 500,
        budget_item_id: "bi-1",
      },

      {
        category_id: "2",
        category_name: "Entertainment",
        category_type: "expense",
        category_amount: 200,
        repeats: true,
        amount: 200,
        budget_item_id: "bi-2",
      },
      {
        category_id: "3",
        category_name: "Transportation",
        category_type: "expense",
        category_amount: 150,
        repeats: true,
        amount: 150,
        budget_item_id: "bi-3",
      },
    ],
    total: 3,
  },
};

// Mock transaction data for testing
export const mockTransactionData = {
  success: true,
  data: {
    rows: [
      {
        id: 1,
        amount: 250,
        description: "Supermarket shopping",
        transaction_date: "2026-02-05",
        category_id: 1,
        family_id: "family123",
        category_name: "Groceries",
        category_type: "expense" as const,
      },
      {
        id: 2,
        amount: 150,
        description: "Movie tickets",
        transaction_date: "2026-02-08",
        category_id: 2,
        family_id: "family123",
        category_name: "Entertainment",
        category_type: "expense" as const,
      },
      {
        id: 3,
        amount: 100,
        description: "Gas",
        transaction_date: "2026-02-10",
        category_id: 3,
        family_id: "family123",
        category_name: "Transportation",
        category_type: "expense" as const,
      },
    ],
    total: 3,
  },
};

// Empty budget response
export const mockEmptyBudgetData = {
  success: false,
  data: null,
};

// Empty transaction response
export const mockEmptyTransactionData = {
  success: true,
  data: {
    rows: [],
    total: 0,
  },
};

// Mock data with overbudget scenario
export const mockOverbudgetTransactionData = {
  success: true,
  data: {
    rows: [
      {
        id: 1,
        amount: 600, // Over the 500 budget for Groceries
        description: "Supermarket shopping spree",
        transaction_date: "2026-02-05",
        category_id: 1,
        family_id: "family123",
        category_name: "Groceries",
        category_type: "expense" as const,
      },
      {
        id: 2,
        amount: 250, // Over the 200 budget for Entertainment
        description: "Concert tickets",
        transaction_date: "2026-02-08",
        category_id: 2,
        family_id: "family123",
        category_name: "Entertainment",
        category_type: "expense" as const,
      },
      {
        id: 3,
        amount: 50,
        description: "Gas",
        transaction_date: "2026-02-10",
        category_id: 3,
        family_id: "family123",
        category_name: "Transportation",
        category_type: "expense" as const,
      },
    ],
    total: 3,
  },
};

// Mock data with income transactions
export const mockIncomeTransactionData = {
  success: true,
  data: {
    rows: [
      {
        id: 4,
        amount: 3000,
        description: "Monthly salary",
        transaction_date: "2026-02-01",
        category_id: 10,
        family_id: "family123",
        category_name: "Salary",
        category_type: "income" as const,
      },
      {
        id: 5,
        amount: 500,
        description: "Freelance work",
        transaction_date: "2026-02-15",
        category_id: 11,
        family_id: "family123",
        category_name: "Freelance",
        category_type: "income" as const,
      },
    ],
    total: 2,
  },
};
