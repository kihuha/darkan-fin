import "server-only";

import { prisma } from "@/lib/prisma";
import { months_between } from "@/utils/services/goal-service";

export type AICategory = {
  id: string;
  name: string;
  type: "income" | "expense";
  default_amount: number;
  repeats: boolean;
};

export type AIBudgetItem = {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  budgeted_amount: number;
};

export type AITransaction = {
  id: string;
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  amount: number;
  transaction_date: string;
  description: string | null;
};

export type AIGoal = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string;
  notes: string | null;
  is_primary: boolean;
  months_remaining: number;
  required_monthly_contribution: number;
};

export type CategorySpend = {
  category_id: string;
  category_name: string;
  spent: number;
  budgeted: number;
  remaining: number;
  percent_used: number;
  is_over_budget: boolean;
};

export type FamilyAIContext = {
  generated_at: string;
  month: number;
  year: number;
  categories: AICategory[];
  current_budget: AIBudgetItem[];
  total_budgeted_income: number;
  total_budgeted_expenses: number;
  budget_surplus: number;
  month_to_date: {
    total_income: number;
    total_expenses: number;
    by_category: CategorySpend[];
  };
  recent_transactions: AITransaction[];
  goals: AIGoal[];
  primary_goal: AIGoal | null;
};

type LoadOptions = {
  month?: number;
  year?: number;
  recent_days?: number;
};

function to_number(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

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

export async function loadFamilyAIContext(
  family_id: string,
  options: LoadOptions = {},
): Promise<FamilyAIContext> {
  const family_id_big = BigInt(family_id);
  const today = new Date();
  const month = options.month ?? today.getMonth() + 1;
  const year = options.year ?? today.getFullYear();
  const recent_days = options.recent_days ?? 90;

  const month_start = new Date(year, month - 1, 1);
  const month_end = new Date(year, month, 0, 23, 59, 59);
  const recent_window_start = new Date(today);
  recent_window_start.setDate(recent_window_start.getDate() - recent_days);

  const [categories, budget, transactions_in_month, recent_transactions, goals] =
    await Promise.all([
      prisma.category.findMany({
        where: { family_id: family_id_big },
        orderBy: [{ type: "desc" }, { name: "asc" }],
      }),
      prisma.budget.findFirst({
        where: { family_id: family_id_big, month, year },
        include: {
          budget_item: {
            include: {
              category: { select: { name: true, type: true } },
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          family_id: family_id_big,
          transaction_date: { gte: month_start, lte: month_end },
        },
        include: { category: { select: { name: true, type: true } } },
        orderBy: [{ transaction_date: "desc" }, { id: "desc" }],
      }),
      prisma.transaction.findMany({
        where: {
          family_id: family_id_big,
          transaction_date: { gte: recent_window_start },
        },
        include: { category: { select: { name: true, type: true } } },
        orderBy: [{ transaction_date: "desc" }, { id: "desc" }],
        take: 200,
      }),
      prisma.savings_goal.findMany({
        where: { family_id: family_id_big, archived_at: null },
        orderBy: [{ is_primary: "desc" }, { target_date: "asc" }],
      }),
    ]);

  const ai_categories: AICategory[] = categories.map((c) => ({
    id: c.id.toString(),
    name: c.name,
    type: c.type as "income" | "expense",
    default_amount: to_number(c.amount),
    repeats: c.repeats,
  }));

  const current_budget: AIBudgetItem[] = (budget?.budget_item ?? []).map(
    (item) => ({
      category_id: item.category_id.toString(),
      category_name: item.category.name,
      category_type: item.category.type as "income" | "expense",
      budgeted_amount: to_number(item.amount),
    }),
  );

  const total_budgeted_income = current_budget
    .filter((b) => b.category_type === "income")
    .reduce((sum, b) => sum + b.budgeted_amount, 0);
  const total_budgeted_expenses = current_budget
    .filter((b) => b.category_type === "expense")
    .reduce((sum, b) => sum + b.budgeted_amount, 0);

  const month_income = transactions_in_month
    .filter((t) => t.category.type === "income")
    .reduce((sum, t) => sum + to_number(t.amount), 0);
  const month_expenses = transactions_in_month
    .filter((t) => t.category.type === "expense")
    .reduce((sum, t) => sum + to_number(t.amount), 0);

  const spend_by_category = new Map<string, number>();
  for (const t of transactions_in_month) {
    if (t.category.type !== "expense") continue;
    const key = t.category_id.toString();
    spend_by_category.set(
      key,
      (spend_by_category.get(key) ?? 0) + to_number(t.amount),
    );
  }

  const by_category: CategorySpend[] = current_budget
    .filter((b) => b.category_type === "expense")
    .map((b) => {
      const spent = spend_by_category.get(b.category_id) ?? 0;
      const remaining = b.budgeted_amount - spent;
      const percent_used =
        b.budgeted_amount > 0 ? (spent / b.budgeted_amount) * 100 : 0;
      return {
        category_id: b.category_id,
        category_name: b.category_name,
        spent,
        budgeted: b.budgeted_amount,
        remaining,
        percent_used,
        is_over_budget: spent > b.budgeted_amount && b.budgeted_amount > 0,
      };
    })
    .sort((a, b) => b.percent_used - a.percent_used);

  const ai_recent: AITransaction[] = recent_transactions.map((t) => ({
    id: t.id.toString(),
    category_id: t.category_id.toString(),
    category_name: t.category.name,
    category_type: t.category.type as "income" | "expense",
    amount: to_number(t.amount),
    transaction_date: t.transaction_date.toISOString().split("T")[0],
    description: t.description,
  }));

  const ai_goals: AIGoal[] = goals.map((g) => {
    const target_amount = to_number(g.target_amount);
    const months_remaining = months_between(new Date(), g.target_date);
    return {
      id: g.id.toString(),
      name: g.name,
      target_amount,
      target_date: g.target_date.toISOString().split("T")[0],
      notes: g.notes,
      is_primary: g.is_primary,
      months_remaining,
      required_monthly_contribution:
        months_remaining > 0
          ? Math.ceil(target_amount / months_remaining)
          : target_amount,
    };
  });

  const primary_goal = ai_goals.find((g) => g.is_primary) ?? null;

  return {
    generated_at: new Date().toISOString(),
    month,
    year,
    categories: ai_categories,
    current_budget,
    total_budgeted_income,
    total_budgeted_expenses,
    budget_surplus: total_budgeted_income - total_budgeted_expenses,
    month_to_date: {
      total_income: month_income,
      total_expenses: month_expenses,
      by_category,
    },
    recent_transactions: ai_recent,
    goals: ai_goals,
    primary_goal,
  };
}
