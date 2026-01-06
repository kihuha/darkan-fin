import { ApiError } from "@/utils/errors";
import { getFamilyContextOrThrow, getSessionOrThrow } from "@/utils/auth-helpers";

const mock_get_session = jest.fn();
const mock_one_or_none = jest.fn();

jest.mock("@/utils/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mock_get_session(...args),
    },
  },
}));

jest.mock("@/utils/db", () => ({
  __esModule: true,
  default: {
    oneOrNone: (...args: unknown[]) => mock_one_or_none(...args),
  },
}));

describe("auth helpers", () => {
  beforeEach(() => {
    mock_get_session.mockReset();
    mock_one_or_none.mockReset();
  });

  it("throws 401 when session is missing", async () => {
    mock_get_session.mockResolvedValue(null);

    await expect(getSessionOrThrow(new Headers())).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    } satisfies Partial<ApiError>);
  });

  it("returns session context", async () => {
    mock_get_session.mockResolvedValue({
      user: {
        id: "user-1",
        email: "person@example.com",
        name: "Person",
      },
    });

    await expect(getSessionOrThrow(new Headers())).resolves.toEqual({
      user_id: "user-1",
      email: "person@example.com",
      name: "Person",
    });
  });

  it("throws 403 when user has no family membership", async () => {
    mock_get_session.mockResolvedValue({
      user: {
        id: "user-1",
        email: "person@example.com",
        name: "Person",
      },
    });
    mock_one_or_none.mockResolvedValue(null);

    await expect(getFamilyContextOrThrow(new Headers())).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    } satisfies Partial<ApiError>);
  });

  it("returns family context", async () => {
    mock_get_session.mockResolvedValue({
      user: {
        id: "user-1",
        email: "person@example.com",
        name: "Person",
      },
    });
    mock_one_or_none.mockResolvedValue({
      family_id: "family-1",
      role: "admin",
    });

    await expect(getFamilyContextOrThrow(new Headers())).resolves.toEqual({
      user_id: "user-1",
      email: "person@example.com",
      name: "Person",
      family_id: "family-1",
      role: "admin",
    });
  });
});
