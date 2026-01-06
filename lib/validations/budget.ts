import { z } from "zod";

export const budgetSchema = z.object({
  id: z.string().optional(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const budgetItemSchema = z.object({
  id: z.string().optional(),
  budget_id: z.string().optional(),
  category_id: z.string(),
  amount: z.number().min(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const createBudgetSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  items: z.array(budgetItemSchema),
});

export const updateBudgetSchema = z.object({
  budget_id: z.string(),
  items: z.array(budgetItemSchema),
});

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type CreateBudget = z.infer<typeof createBudgetSchema>;
export type UpdateBudget = z.infer<typeof updateBudgetSchema>;
