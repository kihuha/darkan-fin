import { z } from "zod";

import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { checkTransactionAgainstBudget } from "@/utils/services/budget-progress";

const request_schema = z.object({
  category_id: z.coerce.string().min(1, "category_id is required"),
  amount: z.coerce
    .number({ error: "amount must be a number" })
    .min(0, "amount must be positive"),
  transaction_date: z
    .string()
    .min(1, "transaction_date is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "transaction_date must be a valid date",
    }),
  exclude_transaction_id: z.coerce.string().optional(),
});

export const POST = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed = request_schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed.error.issues,
    );
  }

  const { category_id, amount, transaction_date, exclude_transaction_id } =
    parsed.data;

  try {
    const result = await checkTransactionAgainstBudget({
      family_id: family.family_id,
      category_id,
      amount,
      transaction_date: new Date(transaction_date),
      exclude_transaction_id,
    });

    return jsonSuccess(result, {
      request_id,
      status: 200,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Category not found in family") {
      throw new ApiError(404, "NOT_FOUND", error.message);
    }
    throw error;
  }
});
