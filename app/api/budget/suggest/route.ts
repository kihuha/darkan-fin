import { z } from "zod";

import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { loadFamilyAIContext } from "@/utils/ai/context";
import { budget_proposal_system_prompt } from "@/utils/ai/prompts";
import { generateStructuredJson } from "@/utils/ai/llm-client";
import { enforceRateLimit } from "@/utils/server/rate-limit";
import { logInfo, logWarn } from "@/utils/server/logger";

export const maxDuration = 30;

const request_schema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const proposal_item_schema = z.object({
  category_id: z
    .string()
    .min(1, "category_id is required")
    .describe("Must exactly match a category id from the provided context."),
  suggested_amount: z
    .number()
    .min(0)
    .describe("Whole KES value, no decimals."),
  rationale: z
    .string()
    .max(280)
    .describe("One short sentence explaining the suggestion."),
});

const proposal_schema = z.object({
  headline: z
    .string()
    .max(200)
    .describe("One sentence summary of the plan, friendly and goal-aware."),
  monthly_contribution_target: z
    .number()
    .min(0)
    .describe(
      "How much should be set aside each month toward savings/goals (whole KES).",
    ),
  items: z
    .array(proposal_item_schema)
    .max(60)
    .describe("Suggested allocation per category."),
  risks: z
    .array(z.string().max(280))
    .max(5)
    .describe("Trade-offs the user should be aware of."),
});

export type BudgetProposal = z.infer<typeof proposal_schema>;

export const POST = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  enforceRateLimit(`budget_suggest:${family.family_id}`, 6, 60_000);

  const parsed = request_schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed.error.issues,
    );
  }

  const context = await loadFamilyAIContext(family.family_id, parsed.data);

  if (context.categories.length === 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Add at least one category before asking the AI for a budget proposal",
    );
  }

  const system = budget_proposal_system_prompt(context);

  let proposal: BudgetProposal;
  try {
    proposal = await generateStructuredJson({
      schema: proposal_schema,
      system,
      prompt:
        "Produce a goal-aware monthly budget proposal that allocates each relevant category and a monthly_contribution_target. Use only the listed category_ids. Keep numbers whole.",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logWarn("budget_suggest.failed", {
      family_id: family.family_id,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError(
      502,
      "UPSTREAM_ERROR",
      "The AI could not generate a budget proposal right now. Try again shortly.",
    );
  }

  // Filter out hallucinated category ids.
  const valid_category_ids = new Set(context.categories.map((c) => c.id));
  const filtered_items = proposal.items.filter((item) =>
    valid_category_ids.has(item.category_id),
  );

  if (filtered_items.length !== proposal.items.length) {
    logWarn("budget_suggest.invalid_categories_dropped", {
      family_id: family.family_id,
      dropped: proposal.items.length - filtered_items.length,
    });
  }

  // Round suggestions to whole KES values defensively.
  let sanitized_items = filtered_items.map((item) => ({
    ...item,
    suggested_amount: Math.max(0, Math.round(item.suggested_amount)),
  }));

  // Determine current allocation per category for change detection + fallback.
  const current_by_category = new Map<string, number>();
  for (const b of context.current_budget) {
    current_by_category.set(b.category_id, b.budgeted_amount);
  }

  // Drop suggestions that match the current allocation exactly — they're noise
  // for the diff UI. Keep them if the rationale references the goal explicitly,
  // since that's still useful context.
  sanitized_items = sanitized_items.filter((item) => {
    const current = current_by_category.get(item.category_id);
    if (current === undefined) return true;
    return item.suggested_amount !== current;
  });

  // Fallback: AI returned nothing useful. Decide between "balanced" (current
  // budget already looks fine) and "needs_more_data" (we can't propose without
  // more inputs).
  let kind: "plan" | "balanced" | "needs_more_data" = "plan";
  if (sanitized_items.length === 0) {
    if (context.current_budget.length > 0) {
      kind = "balanced";
    } else {
      kind = "needs_more_data";
    }
    logInfo("budget_suggest.empty_proposal", {
      family_id: family.family_id,
      kind,
      had_categories: context.categories.length,
      had_current_budget: context.current_budget.length,
    });
  }

  const proposal_payload = {
    ...proposal,
    kind,
    monthly_contribution_target: Math.max(
      0,
      Math.round(proposal.monthly_contribution_target),
    ),
    items: sanitized_items,
    primary_goal_id: context.primary_goal?.id ?? null,
    generated_at: context.generated_at,
  };

  logInfo("budget_suggest.completed", {
    request_id,
    family_id: family.family_id,
    kind,
    item_count: sanitized_items.length,
    has_primary_goal: Boolean(context.primary_goal),
  });

  return jsonSuccess(proposal_payload, {
    request_id,
    status: 200,
  });
});
