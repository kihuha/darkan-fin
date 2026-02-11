import { Page } from "@playwright/test";
import {
  mockBudgetData,
  mockTransactionData,
  mockEmptyBudgetData,
  mockEmptyTransactionData,
} from "./mockData";

type BudgetDataType = typeof mockBudgetData | typeof mockEmptyBudgetData;
type TransactionDataType =
  | typeof mockTransactionData
  | typeof mockEmptyTransactionData;

/**
 * Mock budget API with custom or default data
 */
export async function mockBudgetAPI(
  page: Page,
  data: BudgetDataType = mockBudgetData,
) {
  await page.route("**/api/budget?month=*&year=*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}

/**
 * Mock transaction API with custom or default data
 */
export async function mockTransactionAPI(
  page: Page,
  data: TransactionDataType = mockTransactionData,
) {
  await page.route("**/api/transaction?month=*&year=*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}

/**
 * Mock category API
 */
export async function mockCategoryAPI(
  page: Page,
  categories: Array<{ id: number; name: string; type: string }> = [
    { id: 1, name: "Groceries", type: "expense" },
    { id: 2, name: "Entertainment", type: "expense" },
    { id: 3, name: "Transportation", type: "expense" },
  ],
) {
  await page.route("**/api/category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: categories,
      }),
    });
  });
}

/**
 * Setup all dashboard-related API mocks with default data
 */
export async function setupDashboardMocks(
  page: Page,
  options?: {
    budgetData?: BudgetDataType;
    transactionData?: TransactionDataType;
  },
) {
  await mockBudgetAPI(page, options?.budgetData);
  await mockTransactionAPI(page, options?.transactionData);
}

/**
 * Mock an empty/no budget state
 */
export async function mockEmptyBudget(page: Page) {
  await mockBudgetAPI(page, mockEmptyBudgetData);
  await mockTransactionAPI(page, mockEmptyTransactionData);
}

/**
 * Mock API error responses
 */
export async function mockBudgetAPIError(page: Page, status: number = 500) {
  await page.route("**/api/budget?month=*&year=*", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
    });
  });
}

export async function mockTransactionAPIError(
  page: Page,
  status: number = 500,
) {
  await page.route("**/api/transaction?month=*&year=*", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
    });
  });
}
