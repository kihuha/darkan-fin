import { z } from "zod";

export const mpesa_import_form_schema = z.object({
  file: z
    .instanceof(File, { message: "Statement file is required" })
    .refine((file) => file.size > 0, "Statement file cannot be empty")
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "Statement file must be 10MB or smaller",
    )
    .refine(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
      "Only PDF statements are supported",
    ),
});

const money_value_schema = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .nullable();

export const mpesa_statement_entry_schema = z.object({
  ref: z.string().trim().max(255).optional(),
  time: z.string().trim().max(64).optional(),
  details: z.string().trim().max(1000).optional(),
  status: z.string().trim().max(64).optional(),
  money_in: money_value_schema,
  money_out: money_value_schema,
});

export const mpesa_transform_response_schema = z
  .array(mpesa_statement_entry_schema)
  .max(5000, "Too many statement rows returned");

export type MpesaTransformEntry = z.infer<typeof mpesa_statement_entry_schema>;
