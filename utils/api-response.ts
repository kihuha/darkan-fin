import "server-only";

import { NextResponse } from "next/server";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import { asApiError } from "@/utils/errors";

type SuccessOptions = {
  request_id?: string;
  status?: number;
};

export function jsonSuccess<T>(
  data: T,
  options: SuccessOptions = {},
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      request_id: options.request_id,
    },
    {
      status: options.status ?? 200,
    },
  );
}

export function jsonNoContent(): Response {
  return new Response(null, { status: 204 });
}

export function jsonError(
  error: unknown,
  requestId?: string,
): NextResponse<ApiErrorResponse> {
  const apiError = asApiError(error);

  return NextResponse.json(
    {
      success: false,
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      request_id: requestId,
      error: apiError.message,
    },
    {
      status: apiError.status,
    },
  );
}
