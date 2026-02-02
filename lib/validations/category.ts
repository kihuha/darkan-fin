import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters"),
  type: z.enum(["income", "expense"]),
  amount: z.number().min(0, "Amount must be positive").optional(),
  repeats: z.boolean(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const createCategorySchema = categorySchema.omit({ id: true }).refine(
  (data) => {
    if (data.repeats && (data.amount === undefined || data.amount === null)) {
      return false;
    }
    return true;
  },
  {
    message: "Amount is required for recurring categories",
    path: ["amount"],
  }
);
export const updateCategorySchema = categorySchema
  .partial()
  .required({ id: true });

export type Category = z.infer<typeof categorySchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
