import { z } from "zod";

const optional_notes_schema = z
  .string()
  .trim()
  .max(1000, "Notes must be less than 1000 characters")
  .optional()
  .nullable()
  .transform((value) => {
    if (value === null || value === undefined || value.length === 0) {
      return null;
    }

    return value;
  });

const iso_date_schema = z
  .string()
  .trim()
  .min(1, "Target date is required")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Target date must be a valid date",
  });

export const goal_schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Goal name is required")
    .max(150, "Goal name must be less than 150 characters"),
  target_amount: z.coerce
    .number({ error: "Target amount must be a number" })
    .positive("Target amount must be greater than zero"),
  target_date: iso_date_schema,
  notes: optional_notes_schema,
  is_primary: z.boolean().optional(),
});

export const create_goal_schema = goal_schema.omit({ id: true });

export const update_goal_schema = goal_schema.partial().required({ id: true });

export const goal_path_param_schema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Goal = z.infer<typeof goal_schema>;
export type CreateGoal = z.infer<typeof create_goal_schema>;
export type UpdateGoal = z.infer<typeof update_goal_schema>;

export type GoalResponse = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string;
  notes: string | null;
  is_primary: boolean;
  archived_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  months_remaining: number;
  required_monthly_contribution: number;
};
