# E2E Testing Mock Guide

## Overview

This guide explains how to use the mock data and API helpers for testing the dashboard and other authenticated pages.

## Authentication Mocking

### Setup Authenticated State

```typescript
import { setupAuthMocks } from "./helpers/auth";

// In your test
await setupAuthMocks(page);
await page.goto("/dashboard");
```

### Setup Login Flow

```typescript
import { setupLoginFlow } from "./helpers/auth";

// For tests that simulate actual login
await setupLoginFlow(page);
await page.goto("/");
// ... fill in login form ...
```

## API Mocking

### Quick Setup with Defaults

```typescript
import { setupDashboardMocks } from "./helpers/apiMocks";
import { setupAuthMocks } from "./helpers/auth";

test("my test", async ({ page }) => {
  await setupAuthMocks(page);
  await setupDashboardMocks(page);

  await page.goto("/dashboard");
  // Dashboard will load with mock budget and transaction data
});
```

### Custom Data

```typescript
import { setupDashboardMocks } from "./helpers/apiMocks";
import { mockOverbudgetTransactionData } from "./helpers/mockData";

await setupDashboardMocks(page, {
  transactionData: mockOverbudgetTransactionData,
});
```

### Individual API Mocks

```typescript
import { mockBudgetAPI, mockTransactionAPI } from "./helpers/apiMocks";

// Mock budget API only
await mockBudgetAPI(page, customBudgetData);

// Mock transaction API only
await mockTransactionAPI(page, customTransactionData);
```

### Empty State

```typescript
import { mockEmptyBudget } from "./helpers/apiMocks";

await mockEmptyBudget(page);
await page.goto("/dashboard");
// Will show "No budget set" message
```

## Available Mock Data

### Default Data (`mockBudgetData`, `mockTransactionData`)

- Budget: $1000 total (Groceries $500, Entertainment $200, Transportation $300)
- Spent: $500 total (Groceries $250, Entertainment $150, Transportation $100)
- All categories under budget

### Overbudget Data (`mockOverbudgetTransactionData`)

- Groceries: $600 spent (over $500 budget)
- Entertainment: $250 spent (over $200 budget)
- Transportation: $50 spent (under $300 budget)

### Empty Data (`mockEmptyBudgetData`, `mockEmptyTransactionData`)

- No budget set
- No transactions

### Income Data (`mockIncomeTransactionData`)

- Income transactions (salary, freelance)

## Authentication Details

The mocks handle:

- ✅ Session cookie (`better-auth.session_token`)
- ✅ Session validation endpoint (`/api/auth/get-session`)
- ✅ Sign-in endpoint (`/api/auth/sign-in/email`)

### Mock User Data

```json
{
  "name": "Darius",
  "email": "njihiadarius@gmail.com",
  "id": "3raeL7Vt5QIWatlogJMsL5fUWe6v0Xeq",
  "family_id": "family123"
}
```

## Example Test Patterns

### Test with Default Data

```typescript
test("displays budget summary", async ({ page }) => {
  await setupAuthMocks(page);
  await setupDashboardMocks(page);

  await page.goto("/dashboard");

  await expect(page.getByText("$1,000.00")).toBeVisible(); // Total budget
  await expect(page.getByText("$500.00")).toBeVisible(); // Total spent
});
```

### Test with Custom Scenario

```typescript
test("shows overbudget warnings", async ({ page }) => {
  await setupAuthMocks(page);
  await setupDashboardMocks(page, {
    transactionData: mockOverbudgetTransactionData,
  });

  await page.goto("/dashboard");

  await expect(page.getByText("Over Budget")).toBeVisible();
});
```

### Test with Empty State

```typescript
test("handles no budget", async ({ page }) => {
  await setupAuthMocks(page);
  await mockEmptyBudget(page);

  await page.goto("/dashboard");

  await expect(page.getByText(/No budget set for/)).toBeVisible();
});
```

## Running Tests

```bash
# Run all e2e tests
npx playwright test

# Run dashboard tests only
npx playwright test dashboard

# Run with UI mode
npx playwright test --ui

# Run in debug mode
npx playwright test --debug
```

## Key Files

- `helpers/auth.ts` - Authentication mocking utilities
- `helpers/apiMocks.ts` - API endpoint mocking utilities
- `helpers/mockData.ts` - Reusable mock data definitions
- `dashboard.spec.ts` - Dashboard page tests
- `login.spec.ts` - Login flow tests
