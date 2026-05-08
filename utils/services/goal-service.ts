import "server-only";

import type { GoalResponse } from "@/lib/validations/goal";

type RawGoal = {
  id: bigint;
  family_id: bigint;
  created_by_user_id: string;
  name: string;
  target_amount: { toNumber?: () => number } | number | string;
  target_date: Date;
  notes: string | null;
  is_primary: boolean;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function to_number(value: RawGoal["target_amount"]): number {
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
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return Number(value);
}

export function months_between(from: Date, to: Date): number {
  const ms_per_day = 1000 * 60 * 60 * 24;
  const diff_days = Math.max(
    0,
    Math.ceil((to.getTime() - from.getTime()) / ms_per_day),
  );
  // Average month length keeps the UI stable across short months.
  return Math.max(1, Math.round(diff_days / 30));
}

export function serialize_goal(goal: RawGoal): GoalResponse {
  const target_amount = to_number(goal.target_amount);
  const months_remaining = months_between(new Date(), goal.target_date);
  const required_monthly_contribution =
    months_remaining > 0
      ? Math.ceil(target_amount / months_remaining)
      : target_amount;

  return {
    id: goal.id.toString(),
    name: goal.name,
    target_amount,
    target_date: goal.target_date.toISOString().split("T")[0],
    notes: goal.notes,
    is_primary: goal.is_primary,
    archived_at: goal.archived_at?.toISOString() ?? null,
    created_by_user_id: goal.created_by_user_id,
    created_at: goal.created_at.toISOString(),
    updated_at: goal.updated_at.toISOString(),
    months_remaining,
    required_monthly_contribution,
  };
}
