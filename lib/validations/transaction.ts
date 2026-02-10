import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  userId: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .nullable(),
});

export const createTransactionSchema = transactionSchema.omit({
  id: true,
  userId: true,
});

export const updateTransactionSchema = transactionSchema
  .partial()
  .required({ id: true })
  .omit({ userId: true });

export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;
