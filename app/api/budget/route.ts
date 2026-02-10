import db from "@/utils/db";
import {
  budget_query_schema,
  create_budget_schema,
} from "@/lib/validations/budget";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { scopedAny, scopedOneOrNone } from "@/utils/db/scoped";

type BudgetRecord = {
  id: string;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
};

type CategoryRecord = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number | string | null;
  repeats: boolean;
  description: string | null;
};

type BudgetItemRecord = {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number | string;
  created_at: string;
  updated_at: string;
};

function to_number(value: string | number | null) {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

export const GET = withRouteContext(async ({ request, request_id, family }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed_query = budget_query_schema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!parsed_query.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed_query.error.issues,
    );
  }

  const { month, year } = parsed_query.data;

  let budget = await scopedOneOrNone<BudgetRecord>(
    family.family_id,
    `SELECT id, month, year, created_at, updated_at
     FROM budget
     WHERE family_id = $1
       AND month = $2
       AND year = $3`,
    [month, year],
  );

  if (!budget) {
    budget = await db.one<BudgetRecord>(
      `INSERT INTO budget (family_id, month, year)
       VALUES ($1, $2, $3)
       RETURNING id, month, year, created_at, updated_at`,
      [family.family_id, month, year],
    );
  }

  const categories = await scopedAny<CategoryRecord>(
    family.family_id,
    `SELECT id, name, type, amount, repeats, description
     FROM category
     WHERE family_id = $1
     ORDER BY type DESC, name ASC`,
  );

  const items = await scopedAny<BudgetItemRecord>(
    family.family_id,
    `SELECT id, budget_id, category_id, amount, created_at, updated_at
     FROM budget_item
     WHERE family_id = $1
       AND budget_id = $2`,
    [budget.id],
  );

  const items_by_category = new Map<string, BudgetItemRecord>(
    items.map((item) => [String(item.category_id), item]),
  );

  const payload = {
    ...budget,
    categories: categories.map((category) => {
      const existing_item = items_by_category.get(String(category.id));
      const category_amount = to_number(category.amount);

      return {
        category_id: String(category.id),
        category_name: category.name,
        category_type: category.type,
        category_amount,
        repeats: category.repeats,
        amount: existing_item
          ? to_number(existing_item.amount)
          : category.repeats
            ? category_amount
            : 0,
        budget_item_id: existing_item?.id,
      };
    }),
  };

  return jsonSuccess(payload, {
    request_id,
    status: 200,
  });
});

export const POST = withRouteContext(async ({ request, request_id, family }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed_body = create_budget_schema.safeParse(await request.json());

  if (!parsed_body.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed_body.error.issues,
    );
  }

  const { month, year, items } = parsed_body.data;

  await db.tx(async (tx) => {
    let budget = await tx.oneOrNone<{ id: string }>(
      `SELECT id
       FROM budget
       WHERE family_id = $1
         AND month = $2
         AND year = $3`,
      [family.family_id, month, year],
    );

    if (!budget) {
      budget = await tx.one<{ id: string }>(
        `INSERT INTO budget (family_id, month, year)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [family.family_id, month, year],
      );
    }

    const category_ids = Array.from(new Set(items.map((item) => item.category_id)));

    if (category_ids.length > 0) {
      const valid_categories = await tx.any<{ id: string }>(
        `SELECT id
         FROM category
         WHERE family_id = $1
           AND id IN ($2:csv)`,
        [family.family_id, category_ids],
      );

      if (valid_categories.length !== category_ids.length) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "One or more categories are invalid",
        );
      }
    }

    if (items.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const rows = items
      .map((item, index) => {
        const offset = index * 4;
        values.push(budget.id, item.category_id, item.amount, family.family_id);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(", ");

    await tx.none(
      `INSERT INTO budget_item (budget_id, category_id, amount, family_id)
       VALUES ${rows}
       ON CONFLICT (budget_id, category_id)
       DO UPDATE SET amount = EXCLUDED.amount,
                     updated_at = NOW()`,
      values,
    );
  });

  return jsonSuccess(
    {
      message: "Budget saved successfully",
    },
    {
      request_id,
      status: 200,
    },
  );
});
