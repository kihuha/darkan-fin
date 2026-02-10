import "server-only";

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";
import { jsonError } from "@/utils/api-response";
import {
  assertAdmin,
  getFamilyContextOrThrow,
  getSessionOrThrow,
  type FamilyContext,
  type SessionContext,
} from "@/utils/auth-helpers";
import { ApiError } from "@/utils/errors";

type RouteAuthMode = "none" | "user" | "family" | "admin";

export type RouteContext = {
  request: NextRequest;
  request_id: string;
  user?: SessionContext;
  family?: FamilyContext;
};

export function withRouteContext(
  handler: (ctx: RouteContext) => Promise<Response>,
  options: { auth?: RouteAuthMode } = {},
): (request: NextRequest) => Promise<Response> {
  const authMode = options.auth ?? "family";

  return async (request: NextRequest) => {
    const request_id = request.headers.get("x-request-id") ?? randomUUID();

    try {
      const ctx: RouteContext = {
        request,
        request_id,
      };

      if (authMode === "user") {
        ctx.user = await getSessionOrThrow(request.headers);
      }

      if (authMode === "family" || authMode === "admin") {
        const familyContext = await getFamilyContextOrThrow(request.headers);
        ctx.family = familyContext;
        ctx.user = familyContext;

        if (authMode === "admin") {
          assertAdmin(familyContext);
        }
      }

      return await handler(ctx);
    } catch (error) {
      return jsonError(error, request_id);
    }
  };
}

export async function parseJsonBody<Schema extends ZodTypeAny>(
  request: NextRequest,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed.error.issues,
    );
  }

  return parsed.data;
}

export function parseSearchParams<Schema extends ZodTypeAny>(
  request: NextRequest,
  schema: Schema,
): z.infer<Schema> {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed.error.issues,
    );
  }

  return parsed.data;
}

export function parseFormData<Schema extends ZodTypeAny>(
  form_data: FormData,
  schema: Schema,
): z.infer<Schema> {
  const raw = Object.fromEntries(form_data.entries());
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed.error.issues,
    );
  }

  return parsed.data;
}
