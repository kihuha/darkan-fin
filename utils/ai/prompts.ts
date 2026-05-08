import "server-only";

import type { FamilyAIContext } from "@/utils/ai/context";

export const DARKAN_FINNY_PERSONA = `You are "DarkanFinny," a knowledgeable, empathetic, and non-judgmental personal finance assistant. Your goal is to help users improve their financial literacy, create sustainable budgets, and develop healthy money habits. You explain complex financial concepts in simple, accessible language. Currency is in KES (Kenyan Shillings) unless otherwise specified.

### TONE AND VOICE
* Empathetic: Money is stressful. Acknowledge effort and progress.
* Non-Judgmental: Never shame the user for past spending.
* Objective: Offer trade-offs rather than dictating one path.
* Clear: Avoid jargon. If a technical term is unavoidable, define it briefly.
* Friendly and warm, but concise. Short sentences, plain language.

### CRITICAL GUARDRAILS
1. You are an AI, not a certified financial advisor. Add a brief disclaimer when asked for specific investment or tax advice.
2. Never recommend buying or selling specific stocks/crypto. Educate on principles instead.
3. Do not request or store sensitive credentials, full bank account numbers, or government IDs.`;

const DEFAULT_PROMPT_FOOTER = `If the user asks something that the provided context cannot answer, say so plainly and ask for what is missing instead of guessing.`;

function format_currency(amount: number): string {
  return amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });
}

export function summarize_context_for_prompt(context: FamilyAIContext): string {
  const lines: string[] = [];

  lines.push(`### FAMILY CONTEXT (${context.month}/${context.year})`);
  lines.push(
    `Budgeted income: ${format_currency(context.total_budgeted_income)} | Budgeted expenses: ${format_currency(context.total_budgeted_expenses)} | Surplus: ${format_currency(context.budget_surplus)}`,
  );
  lines.push(
    `Month-to-date: income ${format_currency(context.month_to_date.total_income)}, expenses ${format_currency(context.month_to_date.total_expenses)}.`,
  );

  if (context.categories.length > 0) {
    lines.push("");
    lines.push(`### CATEGORIES (id | type | name | typical amount)`);
    for (const c of context.categories) {
      lines.push(
        `- ${c.id} | ${c.type} | ${c.name} | ${format_currency(c.default_amount)}${c.repeats ? " (recurring)" : ""}`,
      );
    }
  }

  if (context.primary_goal) {
    const g = context.primary_goal;
    lines.push("");
    lines.push(`### PRIMARY GOAL`);
    lines.push(
      `${g.name}: target ${format_currency(g.target_amount)} by ${g.target_date} (${g.months_remaining} months remaining).`,
    );
    lines.push(
      `Requires roughly ${format_currency(g.required_monthly_contribution)} per month.${g.notes ? ` Notes: ${g.notes}` : ""}`,
    );
  } else if (context.goals.length > 0) {
    lines.push("");
    lines.push(`### GOALS (no primary set)`);
    for (const g of context.goals.slice(0, 5)) {
      lines.push(
        `- ${g.name}: ${format_currency(g.target_amount)} by ${g.target_date} (~${format_currency(g.required_monthly_contribution)}/mo).`,
      );
    }
  }

  if (context.month_to_date.by_category.length > 0) {
    lines.push("");
    lines.push(`### CATEGORY SPEND vs BUDGET (this month)`);
    for (const c of context.month_to_date.by_category.slice(0, 12)) {
      const flag = c.is_over_budget ? " [OVER]" : "";
      lines.push(
        `- ${c.category_name}: spent ${format_currency(c.spent)} of ${format_currency(c.budgeted)} (${c.percent_used.toFixed(0)}%)${flag}`,
      );
    }
  }

  if (context.current_budget.length > 0) {
    lines.push("");
    lines.push(`### BUDGET ALLOCATIONS (${context.month}/${context.year})`);
    for (const b of context.current_budget.slice(0, 25)) {
      lines.push(
        `- ${b.category_name} (${b.category_type}): ${format_currency(b.budgeted_amount)}`,
      );
    }
  }

  if (context.recent_transactions.length > 0) {
    lines.push("");
    lines.push(`### RECENT TRANSACTIONS (most recent 25)`);
    for (const t of context.recent_transactions.slice(0, 25)) {
      lines.push(
        `- ${t.transaction_date} | ${t.category_name} (${t.category_type}) | ${format_currency(t.amount)}${t.description ? ` — ${t.description}` : ""}`,
      );
    }
  }

  return lines.join("\n");
}

export function chat_system_prompt(context: FamilyAIContext): string {
  return [
    DARKAN_FINNY_PERSONA,
    "",
    "Use the family context below to ground every answer. Reference categories and goals by name where relevant. If the user mentions a goal, weigh advice against its required monthly contribution.",
    "",
    summarize_context_for_prompt(context),
    "",
    DEFAULT_PROMPT_FOOTER,
  ].join("\n");
}

export function budget_proposal_system_prompt(context: FamilyAIContext): string {
  const goal_block = context.primary_goal
    ? `Primary goal: "${context.primary_goal.name}" — ${format_currency(
        context.primary_goal.target_amount,
      )} by ${context.primary_goal.target_date}. Required monthly contribution ≈ ${format_currency(
        context.primary_goal.required_monthly_contribution,
      )}.`
    : "There is no primary goal — focus on a healthy, sustainable budget with a reasonable savings rate (10-20% of income).";

  return [
    DARKAN_FINNY_PERSONA,
    "",
    `You are creating a structured monthly budget proposal for the family. Output must be JSON matching the schema you are given. Keep rationales short (one or two sentences). Numbers must be whole KES values (no decimals).`,
    "",
    goal_block,
    "",
    `Hard constraints:`,
    `- Use ONLY the category_ids listed under "### CATEGORIES" below. Never invent new categories.`,
    `- The "items" array MUST contain exactly one entry for every category listed under "### CATEGORIES" — do not omit any. If you genuinely think a category should not be funded this month, set its suggested_amount to 0 and say why in the rationale.`,
    `- monthly_contribution_target should leave room within projected income for the primary goal (if any).`,
    `- The sum of expense suggestions + monthly_contribution_target must be ≤ projected monthly income (or last month's income if this month's is zero).`,
    `- Prefer adjusting expense categories the user actually overspends on. Recurring categories should keep at least their committed amount unless the rationale clearly justifies otherwise.`,
    `- If projected income is unknown or zero, base the proposal on the previous budget totals and explain that assumption in the headline.`,
    `- If the existing budget already looks healthy and goal-aligned, mirror current allocations and use the headline + rationale to praise what's working. Do not invent problems.`,
    "",
    summarize_context_for_prompt(context),
    "",
    DEFAULT_PROMPT_FOOTER,
  ].join("\n");
}

export function insights_system_prompt(context: FamilyAIContext): string {
  return [
    DARKAN_FINNY_PERSONA,
    "",
    `Surface 1-4 short, friendly insights about the family's recent behavior. Each insight should be specific (cite a category by name when relevant) and actionable. Mix encouragement with gentle nudges. Severity: "celebrate" for wins, "info" for neutral, "warn" for risks.`,
    "",
    `If the family has a primary goal, every insight should consider its impact on that goal. If they don't, focus on healthy habits instead.`,
    "",
    summarize_context_for_prompt(context),
    "",
    DEFAULT_PROMPT_FOOTER,
  ].join("\n");
}
