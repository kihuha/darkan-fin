import "server-only";

import {
  mpesa_transform_response_schema,
  type MpesaTransformEntry,
} from "@/lib/validations/mpesa";
import { ApiError } from "@/utils/errors";
import { requireEnv } from "@/utils/server/env";
import { logWarn } from "@/utils/server/logger";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadStatementForTransform(
  file: File,
): Promise<MpesaTransformEntry[]> {
  const api_base_url = requireEnv("API_BASE_URL").replace(/\/$/, "");

  let last_error: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const form_data = new FormData();
      form_data.append("file", file, file.name || "statement.pdf");

      const response = await fetch(`${api_base_url}/statements/upload-pdf`, {
        method: "POST",
        body: form_data,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const response_body = await response.text();

        if (response.status === 400 || response.status === 422) {
          throw new ApiError(
            422,
            "UPSTREAM_ERROR",
            "Statement parser rejected the file",
          );
        }

        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
          logWarn("mpesa_transform.retry", {
            attempt: attempt + 1,
            status: response.status,
          });
          await sleep((attempt + 1) * 300);
          continue;
        }

        throw new ApiError(
          502,
          "UPSTREAM_ERROR",
          response_body
            ? `Statement parser failed with status ${response.status}`
            : "Statement parser request failed",
        );
      }

      const payload: unknown = await response.json();
      const parsed = mpesa_transform_response_schema.safeParse(payload);

      if (!parsed.success) {
        throw new ApiError(
          502,
          "UPSTREAM_ERROR",
          "Statement parser returned an invalid payload",
          parsed.error.issues,
        );
      }

      return parsed.data;
    } catch (error) {
      clearTimeout(timeout);
      last_error = error;

      if (error instanceof ApiError) {
        if (
          error.status >= 500 &&
          error.status < 600 &&
          attempt < MAX_RETRIES
        ) {
          logWarn("mpesa_transform.retry", {
            attempt: attempt + 1,
            status: error.status,
          });
          await sleep((attempt + 1) * 300);
          continue;
        }

        throw error;
      }

      const is_timeout =
        error instanceof DOMException && error.name === "AbortError";

      if (is_timeout && attempt < MAX_RETRIES) {
        logWarn("mpesa_transform.timeout_retry", {
          attempt: attempt + 1,
        });
        await sleep((attempt + 1) * 300);
        continue;
      }

      if (is_timeout) {
        throw new ApiError(
          502,
          "UPSTREAM_ERROR",
          "Statement parser request timed out",
        );
      }

      throw new ApiError(
        502,
        "UPSTREAM_ERROR",
        "Statement parser request failed",
      );
    }
  }

  if (last_error instanceof ApiError) {
    throw last_error;
  }

  throw new ApiError(502, "UPSTREAM_ERROR", "Statement parser request failed");
}
