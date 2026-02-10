import { z } from "zod";

const optional_description_schema = z
  .string()
  .trim()
  .max(500, "Description must be less than 500 characters")
  .optional()
  .nullable()
  .transform((value) => {
    if (value === null || value === undefined || value.length === 0) {
      return null;
    }

    return value;
  });

const tags_schema = z
  .array(z.string().trim().min(1).max(50))
  .max(25, "Tags are limited to 25 items")
  .optional();

export const category_schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters"),
  type: z.enum(["income", "expense"]),
  amount: z
    .coerce
    .number({ error: "Amount must be a number" })
    .min(0, "Amount must be positive")
    .optional(),
  repeats: z.boolean(),
  description: optional_description_schema,
  tags: tags_schema,
});

export const create_category_schema = category_schema
  .omit({ id: true })
  .superRefine((data, ctx) => {
    if (data.repeats && data.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required for recurring categories",
        path: ["amount"],
      });
    }
  });

export const update_category_schema = category_schema
  .partial()
  .required({ id: true })
  .superRefine((data, ctx) => {
    if (data.repeats === true && data.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required for recurring categories",
        path: ["amount"],
      });
    }
  });

export type Category = z.infer<typeof category_schema>;
export type CreateCategory = z.infer<typeof create_category_schema>;
export type UpdateCategory = z.infer<typeof update_category_schema>;

// Backwards-compatible aliases.
export const categorySchema = category_schema;
export const createCategorySchema = create_category_schema;
export const updateCategorySchema = update_category_schema;
