import { z } from "zod";

export const budget_schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const budget_item_schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  budget_id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().min(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const budget_query_schema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const create_budget_schema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  items: z.array(budget_item_schema.pick({ category_id: true, amount: true })).max(500),
});

export const update_budget_schema = z.object({
  budget_id: z.coerce.number().int().positive(),
  items: z.array(budget_item_schema.pick({ category_id: true, amount: true })).max(500),
});

export type Budget = z.infer<typeof budget_schema>;
export type BudgetItem = z.infer<typeof budget_item_schema>;
export type CreateBudget = z.infer<typeof create_budget_schema>;
export type UpdateBudget = z.infer<typeof update_budget_schema>;

// Backwards-compatible aliases.
export const budgetSchema = budget_schema;
export const budgetItemSchema = budget_item_schema;
export const budgetQuerySchema = budget_query_schema;
export const createBudgetSchema = create_budget_schema;
export const updateBudgetSchema = update_budget_schema;
