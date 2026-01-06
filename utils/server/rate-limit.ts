import "server-only";

import { ApiError } from "@/utils/errors";

type Counter = {
  count: number;
  reset_at: number;
};

const counters = new Map<string, Counter>();

export function enforceRateLimit(
  key: string,
  limit: number,
  window_ms: number,
): void {
  const now = Date.now();
  const current = counters.get(key);

  if (!current || current.reset_at <= now) {
    counters.set(key, {
      count: 1,
      reset_at: now + window_ms,
    });
    return;
  }

  if (current.count >= limit) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many requests, please try again later",
    );
  }

  current.count += 1;
  counters.set(key, current);
}
