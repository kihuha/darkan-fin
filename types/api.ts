import type { ZodIssue } from "zod";

export const apiErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  request_id?: string;
};

export type ApiErrorResponse = {
  success: false;
  code: ApiErrorCode;
  message: string;
  details?: ZodIssue[];
  request_id?: string;
  // Kept for existing client compatibility while code migrates to `message`.
  error?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
