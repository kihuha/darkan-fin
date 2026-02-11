import { test, expect } from "@playwright/test";
import { setupLoginFlow } from "./helpers/auth";

test("should login successfully and redirect to dashboard", async ({
  page,
}) => {
  // Setup complete authentication flow (sign-in + session mocks)
  await setupLoginFlow(page);

  await page.goto("/");

  // Check if the sign-in description is visible
  const signInDescription = page.getByText(
    "Sign in to keep your finances in sync.",
  );
  await expect(signInDescription).toBeVisible();

  // Fill in the login form
  await page.getByRole("textbox", { name: "Email" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill("tester@mail.com");
  await page.getByRole("textbox", { name: "Email" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("Tester1234!");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Check if the user is redirected to the dashboard
  await expect(page).toHaveURL("/dashboard");
});
