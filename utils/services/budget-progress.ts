import "server-only";

import { prisma } from "@/lib/prisma";

type CheckInput = {
  family_id: string;
  category_id: string;
  amount: number;
  transaction_date: Date;
  exclude_transaction_id?: string;
};

export type BudgetProgressCheck = {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  budgeted_amount: number;
  spent_so_far: number;
  projected_total: number;
  projected_remaining: number;
  would_overspend: boolean;
  overspend_amount: number;
  budget_exists: boolean;
  primary_goal: {
    id: string;
    name: string;
    required_monthly_contribution: number;
  } | null;
  deters_primary_goal: boolean;
  goal_buffer_remaining: number;
  friendly_message: string | null;
};

function to_number(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber?: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function format_currency(amount: number): string {
  return amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });
}

export async function checkTransactionAgainstBudget(
  input: CheckInput,
): Promise<BudgetProgressCheck> {
  const family_id = BigInt(input.family_id);
  const category_id = BigInt(input.category_id);
  const month = input.transaction_date.getMonth() + 1;
  const year = input.transaction_date.getFullYear();

  const month_start = new Date(year, month - 1, 1);
  const month_end = new Date(year, month, 0, 23, 59, 59);

  const [category, budget_item, mtd_aggregate, primary_goal] = await Promise.all([
    prisma.category.findFirst({
      where: { id: category_id, family_id },
      select: { id: true, name: true, type: true },
    }),
    prisma.budget_item.findFirst({
      where: {
        family_id,
        category_id,
        budget: { family_id, month, year },
      },
      include: {
        budget: { select: { id: true, month: true, year: true } },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        family_id,
        category_id,
        transaction_date: { gte: month_start, lte: month_end },
        ...(input.exclude_transaction_id
          ? { id: { not: BigInt(input.exclude_transaction_id) } }
          : {}),
      },
      _sum: { amount: true },
    }),
    prisma.savings_goal.findFirst({
      where: {
        family_id,
        is_primary: true,
        archived_at: null,
      },
    }),
  ]);

  if (!category) {
    throw new Error("Category not found in family");
  }

  const budgeted_amount = budget_item ? to_number(budget_item.amount) : 0;
  const spent_so_far = mtd_aggregate._sum.amount
    ? to_number(mtd_aggregate._sum.amount)
    : 0;

  const is_expense = category.type === "expense";
  const proposed_amount = Math.max(0, input.amount);
  const projected_total = is_expense
    ? spent_so_far + proposed_amount
    : spent_so_far + proposed_amount;
  const projected_remaining = budgeted_amount - projected_total;
  const would_overspend =
    is_expense && budget_item ? projected_total > budgeted_amount : false;
  const overspend_amount = would_overspend ? projected_total - budgeted_amount : 0;

  let primary_goal_summary: BudgetProgressCheck["primary_goal"] = null;
  let deters_primary_goal = false;
  let goal_buffer_remaining = 0;

  if (primary_goal) {
    const target_amount = to_number(primary_goal.target_amount);
    const target_date = primary_goal.target_date;
    const today = new Date();
    const ms_per_day = 1000 * 60 * 60 * 24;
    const months_remaining = Math.max(
      1,
      Math.round(
        Math.max(0, target_date.getTime() - today.getTime()) /
          ms_per_day /
          30,
      ),
    );
    const required_monthly_contribution = Math.ceil(
      target_amount / months_remaining,
    );
    primary_goal_summary = {
      id: primary_goal.id.toString(),
      name: primary_goal.name,
      required_monthly_contribution,
    };

    if (is_expense) {
      // Buffer = (budgeted_amount - spent_so_far) the headroom in this category
      // before we eat into surplus. If overspend exceeds the goal's monthly need
      // it is "goal-deterring".
      goal_buffer_remaining = Math.max(0, budgeted_amount - spent_so_far);
      deters_primary_goal =
        would_overspend && overspend_amount > 0 &&
        overspend_amount >=
          Math.max(1, Math.round(required_monthly_contribution * 0.05));
    }
  }

  let friendly_message: string | null = null;
  if (would_overspend) {
    const over = format_currency(overspend_amount);
    if (deters_primary_goal && primary_goal_summary) {
      friendly_message = `Heads up: this would push ${category.name} ${over} over budget and chip into your "${primary_goal_summary.name}" plan for the month. Worth a quick double-check.`;
    } else {
      friendly_message = `Heads up: this puts ${category.name} ${over} over budget for ${input.transaction_date.toLocaleString(
        "default",
        { month: "long" },
      )}. Still fine to log if you've planned for it.`;
    }
  } else if (budget_item && projected_total / budgeted_amount > 0.9) {
    friendly_message = `You're at ${(
      (projected_total / budgeted_amount) *
      100
    ).toFixed(0)}% of your ${category.name} budget after this. Just a friendly check-in.`;
  }

  return {
    category_id: category.id.toString(),
    category_name: category.name,
    category_type: category.type as "income" | "expense",
    budgeted_amount,
    spent_so_far,
    projected_total,
    projected_remaining,
    would_overspend,
    overspend_amount,
    budget_exists: Boolean(budget_item),
    primary_goal: primary_goal_summary,
    deters_primary_goal,
    goal_buffer_remaining,
    friendly_message,
  };
}
