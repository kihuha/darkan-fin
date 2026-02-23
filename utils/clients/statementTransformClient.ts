import "server-only";

import {
  statement_transform_response_schema,
  type StatementTransformEntry,
} from "@/lib/validations/statement";
import { ApiError } from "@/utils/errors";
import { requireEnv } from "@/utils/server/env";
import { logWarn } from "@/utils/server/logger";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_UPSTREAM_MESSAGE_LENGTH = 240;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePdfFile(file: File): File {
  const is_pdf_name = file.name.toLowerCase().endsWith(".pdf");

  if (!is_pdf_name || file.type === "application/pdf") {
    return file;
  }

  // Some clients send empty or generic MIME types for PDFs.
  return new File([file], file.name, {
    type: "application/pdf",
    lastModified: file.lastModified,
  });
}

function sanitizeUpstreamMessage(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("<!DOCTYPE") || normalized.startsWith("<html")) {
    return null;
  }

  return normalized.slice(0, MAX_UPSTREAM_MESSAGE_LENGTH);
}

function readObjectMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  for (const key of ["message", "error", "detail"]) {
    const value = obj[key];
    if (typeof value === "string") {
      return sanitizeUpstreamMessage(value);
    }
  }

  return null;
}

async function readUpstreamErrorMessage(
  response: Response,
): Promise<string | null> {
  const content_type = response.headers.get("content-type") ?? "";

  try {
    if (content_type.toLowerCase().includes("application/json")) {
      const payload: unknown = await response.json();
      return readObjectMessage(payload);
    }
  } catch {
    return null;
  }

  try {
    const text = await response.text();
    return sanitizeUpstreamMessage(text);
  } catch {
    return null;
  }
}

export async function uploadStatementForTransform(
  file: File,
  password?: string,
): Promise<StatementTransformEntry[]> {
  const api_base_url = requireEnv("API_BASE_URL").replace(/\/$/, "");
  const normalized_file = normalizePdfFile(file);

  let last_error: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const form_data = new FormData();
      form_data.append(
        "file",
        normalized_file,
        normalized_file.name || "statement.pdf",
      );
      if (password) {
        form_data.append("password", password);
      }

      const response = await fetch(`${api_base_url}/statements/upload-pdf`, {
        method: "POST",
        body: form_data,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const response_message = await readUpstreamErrorMessage(response);

        if (response.status === 400 || response.status === 422) {
          throw new ApiError(
            422,
            "UPSTREAM_ERROR",
            response_message || "Statement parser rejected the file",
          );
        }

        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
          logWarn("statement_transform.retry", {
            attempt: attempt + 1,
            status: response.status,
          });
          await sleep((attempt + 1) * 300);
          continue;
        }

        throw new ApiError(
          502,
          "UPSTREAM_ERROR",
          response_message
            ? `Statement parser failed with status ${response.status}: ${response_message}`
            : `Statement parser failed with status ${response.status}`,
        );
      }

      const payload: unknown = await response.json();
      const parsed = statement_transform_response_schema.safeParse(payload);

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
          logWarn("statement_transform.retry", {
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
        logWarn("statement_transform.timeout_retry", {
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

export async function uploadMultipleStatementsForTransform(
  files: File[],
  passwords?: Record<string, string>,
): Promise<StatementTransformEntry[]> {
  const api_base_url = requireEnv("API_BASE_URL").replace(/\/$/, "");
  const normalized_files = files.map(normalizePdfFile);

  let last_error: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const form_data = new FormData();

      // Append all files with the same field name "files"
      for (const file of normalized_files) {
        form_data.append("files", file, file.name || "statement.pdf");
      }
      if (passwords && Object.keys(passwords).length > 0) {
        form_data.append("passwords", JSON.stringify(passwords));
      }

      const response = await fetch(`${api_base_url}/statements/upload-pdfs`, {
        method: "POST",
        body: form_data,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const response_message = await readUpstreamErrorMessage(response);

        if (response.status === 400 || response.status === 422) {
          throw new ApiError(
            422,
            "UPSTREAM_ERROR",
            response_message || "Statement parser rejected the files",
          );
        }

        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
          logWarn("statement_transform.retry", {
            attempt: attempt + 1,
            status: response.status,
          });
          await sleep((attempt + 1) * 300);
          continue;
        }

        throw new ApiError(
          502,
          "UPSTREAM_ERROR",
          response_message
            ? `Statement parser failed with status ${response.status}: ${response_message}`
            : `Statement parser failed with status ${response.status}`,
        );
      }

      const payload: unknown = await response.json();
      const parsed = statement_transform_response_schema.safeParse(payload);

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
          logWarn("statement_transform.retry", {
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
        logWarn("statement_transform.timeout_retry", {
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
