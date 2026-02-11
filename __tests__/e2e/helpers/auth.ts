import { Page } from "@playwright/test";

export const mockUser = {
  name: "Darius",
  email: "njihiadarius@gmail.com",
  emailVerified: false,
  image: null,
  createdAt: "2026-02-10T00:41:01.392Z",
  updatedAt: "2026-02-10T00:41:01.392Z",
  id: "3raeL7Vt5QIWatlogJMsL5fUWe6v0Xeq",
  family_id: "family123",
};

// Mock token that matches the format from the real API
export const mockToken = "d2oXBp7HYa1oJCuj8wPypFvGx6W2Y2F2";
export const mockCookieValue = `${mockToken}.BS8lQo2re%2FimcmlKP1G7ZkpUvEA1HrfBZDH3gMa3YtI%3D`;

export const mockSession = {
  session: {
    id: "session123",
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    token: mockToken,
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    createdAt: "2026-02-10T00:41:01.392Z",
    updatedAt: "2026-02-10T00:41:01.392Z",
  },
  user: mockUser,
};

/**
 * Sets up authentication mocks for a Playwright page
 * This mocks the better-auth session endpoint and sets the authentication cookie
 */
export async function setupAuthMocks(page: Page) {
  // Set authentication cookie first
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: mockCookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Mock better-auth session validation endpoints
  await page.route("**/api/auth/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Handle session-related GET requests
    if (
      method === "GET" &&
      (url.includes("get-session") || url.endsWith("/session"))
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-origin": "http://localhost:3000",
        },
      });
    } else {
      // Let other auth requests continue (they might be mocked elsewhere)
      await route.fallback();
    }
  });
}

/**
 * Mocks the sign-in API endpoint with a successful response
 * Properly sets the authentication cookie like the real API does
 */
export async function mockSignInEndpoint(page: Page) {
  await page.route("**/api/auth/sign-in/email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": "http://localhost:3000",
        "set-cookie": `better-auth.session_token=${mockCookieValue}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify({
        redirect: false,
        token: mockToken,
        user: mockUser,
      }),
    });
  });
}

/**
 * Sets up complete authentication flow for login tests
 * Mocks both the sign-in endpoint and session validation
 * Call this before navigating to the login page
 */
export async function setupLoginFlow(page: Page) {
  // First setup session mocks (for after login)
  await setupAuthMocks(page);

  // Then setup sign-in endpoint (this is more specific, registers last)
  await mockSignInEndpoint(page);
}

/**
 * Simulates a logged-out state by clearing cookies and mocking a failed session
 */
export async function setupLoggedOutState(page: Page) {
  // Clear authentication cookies
  await page.context().clearCookies();

  // Mock session endpoint to return null/unauthorized
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        session: null,
        user: null,
      }),
    });
  });
}
