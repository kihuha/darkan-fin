import { ApiError } from "@/utils/errors";
import { uploadStatementForTransform } from "@/utils/clients/mpesaTransformClient";

const mock_require_env = jest.fn((key: string) => {
  if (key === "API_BASE_URL") {
    return "https://example.test";
  }

  return "value";
});

jest.mock("@/utils/server/env", () => ({
  requireEnv: (key: string) => mock_require_env(key),
}));

jest.mock("@/utils/server/logger", () => ({
  logWarn: jest.fn(),
}));

function json_response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("mpesaTransformClient", () => {
  beforeEach(() => {
    mock_require_env.mockClear();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("returns parsed entries when upstream response is valid", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      json_response([
        {
          ref: "ABC123",
          time: "2026-02-01 12:00:00",
          details: "Payment",
          status: "SUCCESS",
          money_in: "1000",
          money_out: "0",
        },
      ]),
    );

    const file = new File(["pdf"], "statement.pdf", {
      type: "application/pdf",
    });

    const result = await uploadStatementForTransform(file);

    expect(result).toHaveLength(1);
    expect(result[0].ref).toBe("ABC123");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws upstream validation error on 422", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      json_response({ error: "bad statement" }, 422),
    );

    const file = new File(["pdf"], "statement.pdf", {
      type: "application/pdf",
    });

    await expect(uploadStatementForTransform(file)).rejects.toMatchObject({
      status: 422,
      code: "UPSTREAM_ERROR",
    } satisfies Partial<ApiError>);
  });

  it("retries on retryable status and eventually succeeds", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(new Response("upstream down", { status: 503 }))
      .mockResolvedValueOnce(
        json_response([
          {
            ref: "ABC123",
            time: "2026-02-01 12:00:00",
            details: "Payment",
            status: "SUCCESS",
            money_in: "1000",
            money_out: "0",
          },
        ]),
      );

    const file = new File(["pdf"], "statement.pdf", {
      type: "application/pdf",
    });

    await expect(uploadStatementForTransform(file)).resolves.toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when upstream returns invalid payload shape", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      json_response({ invalid: true }, 200),
    );

    const file = new File(["pdf"], "statement.pdf", {
      type: "application/pdf",
    });

    await expect(uploadStatementForTransform(file)).rejects.toMatchObject({
      status: 502,
      code: "UPSTREAM_ERROR",
    } satisfies Partial<ApiError>);
  });
});
