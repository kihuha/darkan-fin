import { z } from "zod";

import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { loadFamilyAIContext } from "@/utils/ai/context";
import { insights_system_prompt } from "@/utils/ai/prompts";
import { generateStructuredJson } from "@/utils/ai/llm-client";
import { logWarn } from "@/utils/server/logger";

export const maxDuration = 30;

const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  expires_at: number;
  payload: InsightsPayload;
};

const cache = new Map<string, CacheEntry>();

const insight_schema = z.object({
  id: z.string().describe("Stable short slug, lowercase-dashed."),
  severity: z
    .enum(["celebrate", "info", "warn"])
    .describe("celebrate for wins, warn for risks, info otherwise"),
  title: z.string().max(120),
  body: z.string().max(500),
  related_category_id: z
    .string()
    .nullable()
    .describe("If the insight is tied to a specific category id."),
  related_goal_id: z
    .string()
    .nullable()
    .describe("If the insight is tied to a specific goal id."),
});

const insights_response_schema = z.object({
  insights: z.array(insight_schema).max(4),
  generated_at: z.string().optional(),
});

export type InsightsPayload = {
  insights: Array<z.infer<typeof insight_schema>>;
  generated_at: string;
  has_primary_goal: boolean;
};

function get_cached(family_id: string): InsightsPayload | null {
  const entry = cache.get(family_id);
  if (!entry) return null;
  if (entry.expires_at <= Date.now()) {
    cache.delete(family_id);
    return null;
  }
  return entry.payload;
}

function set_cached(family_id: string, payload: InsightsPayload): void {
  cache.set(family_id, {
    expires_at: Date.now() + CACHE_TTL_MS,
    payload,
  });
}

export function invalidateInsightsCache(family_id: string): void {
  cache.delete(family_id);
}

export const GET = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const force_refresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!force_refresh) {
    const cached = get_cached(family.family_id);
    if (cached) {
      return jsonSuccess(cached, { request_id, status: 200 });
    }
  }

  const context = await loadFamilyAIContext(family.family_id);

  // Don't bother calling the AI when there's no signal yet.
  if (
    context.recent_transactions.length === 0 &&
    context.current_budget.length === 0 &&
    context.goals.length === 0
  ) {
    const empty: InsightsPayload = {
      insights: [],
      generated_at: new Date().toISOString(),
      has_primary_goal: false,
    };
    set_cached(family.family_id, empty);
    return jsonSuccess(empty, { request_id, status: 200 });
  }

  const system = insights_system_prompt(context);

  let payload: InsightsPayload;
  try {
    const result = await generateStructuredJson({
      schema: insights_response_schema,
      system,
      prompt:
        "Surface 1-4 friendly insights based on the family context above. Each insight should reference concrete numbers or category names where possible. Only flag risks if there's evidence in the data.",
    });

    const valid_category_ids = new Set(context.categories.map((c) => c.id));
    const valid_goal_ids = new Set(context.goals.map((g) => g.id));

    payload = {
      insights: result.insights.map((insight) => ({
        ...insight,
        related_category_id:
          insight.related_category_id &&
          valid_category_ids.has(insight.related_category_id)
            ? insight.related_category_id
            : null,
        related_goal_id:
          insight.related_goal_id && valid_goal_ids.has(insight.related_goal_id)
            ? insight.related_goal_id
            : null,
      })),
      generated_at: new Date().toISOString(),
      has_primary_goal: Boolean(context.primary_goal),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logWarn("insights.failed", {
      family_id: family.family_id,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError(
      502,
      "UPSTREAM_ERROR",
      "Insights are taking a break. Try again shortly.",
    );
  }

  set_cached(family.family_id, payload);

  return jsonSuccess(payload, { request_id, status: 200 });
});
