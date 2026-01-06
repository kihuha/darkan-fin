import { ApiError } from "@/utils/errors";

const mock_db_any = jest.fn();
const mock_db_one = jest.fn();
const mock_db_result = jest.fn();
const mock_db_tx = jest.fn();
const mock_get_family_context = jest.fn();
const mock_get_session = jest.fn();
const mock_assert_admin = jest.fn();

jest.mock("@/utils/db", () => ({
  __esModule: true,
  default: {
    any: (...args: unknown[]) => mock_db_any(...args),
    one: (...args: unknown[]) => mock_db_one(...args),
    result: (...args: unknown[]) => mock_db_result(...args),
    tx: (...args: unknown[]) => mock_db_tx(...args),
  },
}));

jest.mock("@/utils/auth-helpers", () => ({
  getFamilyContextOrThrow: (...args: unknown[]) => mock_get_family_context(...args),
  getSessionOrThrow: (...args: unknown[]) => mock_get_session(...args),
  assertAdmin: (...args: unknown[]) => mock_assert_admin(...args),
}));

import { GET } from "@/app/api/transaction/route";

function createRequest(url: string) {
  return {
    headers: new Headers(),
    nextUrl: new URL(url),
  } as never;
}

describe("transaction route GET", () => {
  beforeEach(() => {
    mock_db_any.mockReset();
    mock_db_one.mockReset();
    mock_db_result.mockReset();
    mock_db_tx.mockReset();
    mock_get_family_context.mockReset();
    mock_get_session.mockReset();
    mock_assert_admin.mockReset();
  });

  it("returns paginated transactions", async () => {
    mock_get_family_context.mockResolvedValue({
      user_id: "user-1",
      email: "person@example.com",
      name: "Person",
      family_id: "10",
      role: "admin",
    });

    mock_db_any.mockResolvedValue([
      {
        id: "1",
        family_id: "10",
        category_id: "2",
        user_id: "user-1",
        amount: "100.50",
        transaction_date: "2026-02-01",
        description: "Lunch",
        category_name: "Food",
        category_type: "expense",
        total_count: "1",
      },
    ]);

    const response = await GET(
      createRequest("http://localhost/api/transaction?page=0&rows_per_page=20"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.rows).toHaveLength(1);
    expect(payload.data.pagination.total).toBe(1);
  });

  it("returns validation error for invalid query", async () => {
    mock_get_family_context.mockResolvedValue({
      user_id: "user-1",
      email: "person@example.com",
      name: "Person",
      family_id: "10",
      role: "admin",
    });

    const response = await GET(
      createRequest("http://localhost/api/transaction?page=-1&rows_per_page=5000"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 for unauthenticated access", async () => {
    mock_get_family_context.mockRejectedValue(
      new ApiError(401, "UNAUTHENTICATED", "Authentication required"),
    );

    const response = await GET(
      createRequest("http://localhost/api/transaction?page=0&rows_per_page=20"),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe("UNAUTHENTICATED");
  });
});
