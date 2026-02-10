import "server-only";

import db from "@/utils/db";
import { ApiError } from "@/utils/errors";

function assertFamilyScoped(query: string) {
  if (!/\bfamily_id\b/i.test(query)) {
    throw new Error("Scoped query must include family_id in SQL");
  }
}

export async function scopedAny<T>(
  family_id: string,
  query: string,
  values: unknown[] = [],
): Promise<T[]> {
  assertFamilyScoped(query);
  return db.any<T>(query, [family_id, ...values]);
}

export async function scopedOneOrNone<T>(
  family_id: string,
  query: string,
  values: unknown[] = [],
): Promise<T | null> {
  assertFamilyScoped(query);
  return db.oneOrNone<T>(query, [family_id, ...values]);
}

export async function scopedOne<T>(
  family_id: string,
  query: string,
  values: unknown[] = [],
): Promise<T> {
  assertFamilyScoped(query);
  return db.one<T>(query, [family_id, ...values]);
}

export function requireFoundInFamily<T>(
  record: T | null | undefined,
  resource_name = "Resource",
): T {
  if (!record) {
    throw new ApiError(404, "NOT_FOUND", `${resource_name} not found`);
  }

  return record;
}
