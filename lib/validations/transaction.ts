import { z } from "zod";

const iso_date_schema = z.iso.date("Transaction date must be in YYYY-MM-DD format");

const optional_description_schema = z
  .string()
  .trim()
  .max(1000, "Description must be less than 1000 characters")
  .optional()
  .nullable()
  .transform((value) => {
    if (value === null || value === undefined || value.length === 0) {
      return null;
    }

    return value;
  });

export const transaction_schema = z.object({
  id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive(),
  user_id: z.string().optional(),
  amount: z.coerce
    .number({ error: "Amount must be a number" })
    .positive("Amount must be positive"),
  transaction_date: z
    .string()
    .trim()
    .refine((value) => iso_date_schema.safeParse(value).success, {
      message: "Transaction date must be in YYYY-MM-DD format",
    }),
  description: optional_description_schema,
});

export const create_transaction_schema = transaction_schema.omit({
  id: true,
  user_id: true,
});

export const update_transaction_schema = transaction_schema
  .partial()
  .required({ id: true })
  .omit({ user_id: true })
  .superRefine((data, ctx) => {
    const provided_fields = Object.keys(data).filter((key) => key !== "id");

    if (provided_fields.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
    }
  });

export const transaction_query_schema = z
  .object({
    page: z.coerce.number().int().min(0).default(0),
    rows_per_page: z.coerce.number().int().min(1).max(100).default(20),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.month !== undefined && data.year === undefined) ||
        (data.month === undefined && data.year !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "month and year must be provided together",
        path: ["month"],
      });
    }
  });

export const transaction_delete_query_schema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateTransaction = z.infer<typeof create_transaction_schema>;
export type UpdateTransaction = z.infer<typeof update_transaction_schema>;
export type TransactionQuery = z.infer<typeof transaction_query_schema>;

// Backwards-compatible aliases.
export const transactionSchema = transaction_schema;
export const createTransactionSchema = create_transaction_schema;
export const updateTransactionSchema = update_transaction_schema;
