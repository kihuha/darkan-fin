import { test, expect } from "@playwright/test";
import { setupAuthMocks } from "./helpers/auth";

import { setupDashboardMocks, mockEmptyBudget } from "./helpers/apiMocks";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication mocks
    await setupAuthMocks(page);

    // Setup default dashboard API mocks
    await setupDashboardMocks(page);
  });

  test("should load dashboard with mocked authentication", async ({ page }) => {
    await page.goto("/dashboard");

    // Check if we're on the dashboard page (not redirected to login)
    await expect(page).toHaveURL("/dashboard");

    // Check if the Dashboard header is visible
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("should allow month and year selection", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for selects to be available
    await page.waitForSelector('[role="combobox"]', { timeout: 5000 });

    // Check if year and month selects are present
    const selects = page.locator('[role="combobox"]');
    await expect(selects).toHaveCount(2);
  });

  test("should handle empty budget data", async ({ page }) => {
    // Setup empty budget state
    await mockEmptyBudget(page);

    await page.goto("/dashboard");

    // Should show "No budget set" message
    await expect(page.getByText(/No budget set for/)).toBeVisible();
  });
});
