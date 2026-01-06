import "server-only";

import { ZodError, type ZodIssue } from "zod";
import type { ApiErrorCode } from "@/types/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: ZodIssue[];

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: ZodIssue[],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validationError(
  message: string,
  details?: ZodIssue[],
): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", message, details);
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new ApiError(
      400,
      "VALIDATION_ERROR",
      "Request body must be valid JSON",
    );
  }

  if (error instanceof ZodError) {
    return validationError("Validation failed", error.issues);
  }

  return new ApiError(500, "INTERNAL_ERROR", "Unexpected server error");
}
