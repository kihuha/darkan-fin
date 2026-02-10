import "server-only";

import { z } from "zod";
import { ApiError } from "@/utils/errors";

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
    BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),
    NEXT_PUBLIC_BETTER_AUTH_URL: z
      .url("NEXT_PUBLIC_BETTER_AUTH_URL must be a valid URL")
      .optional(),
    API_BASE_URL: z.url("API_BASE_URL must be a valid URL").optional(),
    APP_URL: z.url("APP_URL must be a valid URL").optional(),
    INVITE_TOKEN_PEPPER: z
      .string()
      .min(16, "INVITE_TOKEN_PEPPER must be at least 16 characters")
      .optional(),
  })
  .passthrough();

type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Environment variables are invalid",
      parsed.error.issues,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function requireEnv<Key extends keyof ServerEnv>(key: Key): string {
  const env = getServerEnv();
  const value = env[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(500, "INTERNAL_ERROR", `${String(key)} is not configured`);
  }

  return value;
}
