import db from "@/utils/db";
import {
  create_transaction_schema,
  transaction_delete_query_schema,
  transaction_query_schema,
  update_transaction_schema,
} from "@/lib/validations/transaction";
import { ApiError } from "@/utils/errors";
import { jsonNoContent, jsonSuccess } from "@/utils/api-response";
import { withRouteContext } from "@/utils/route";
import { requireFoundInFamily, scopedOneOrNone } from "@/utils/db/scoped";

function normalizeTransactionPayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    category_id: payload.category_id ?? payload.categoryId,
    transaction_date: payload.transaction_date ?? payload.transactionDate,
  };
}

export const GET = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const raw_search_params = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );

  if (
    raw_search_params.rows_per_page === undefined &&
    raw_search_params.rowsPerPage !== undefined
  ) {
    raw_search_params.rows_per_page = raw_search_params.rowsPerPage;
  }

  const parsed_query = transaction_query_schema.safeParse(raw_search_params);

  if (!parsed_query.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed_query.error.issues,
    );
  }

  const { page, rows_per_page, month, year } = parsed_query.data;
  const should_paginate = month === undefined || year === undefined;

  const values: unknown[] = [family.family_id];
  const filters = ["t.family_id = $1"];

  if (month !== undefined && year !== undefined) {
    values.push(month, year);
    filters.push(
      `EXTRACT(MONTH FROM t.transaction_date) = $${values.length - 1}`,
    );
    filters.push(`EXTRACT(YEAR FROM t.transaction_date) = $${values.length}`);
  }

  let pagination_clause = "";

  if (should_paginate) {
    values.push(rows_per_page, page * rows_per_page);
    const limit_index = values.length - 1;
    const offset_index = values.length;
    pagination_clause = `\n     LIMIT $${limit_index}\n     OFFSET $${offset_index}`;
  }

  const rows = await db.any<{
    id: string;
    family_id: string;
    category_id: string;
    user_id: string;
    amount: number | string;
    transaction_date: string;
    description: string | null;
    category_name: string;
    category_type: "income" | "expense";
    total_count: string;
  }>(
    `SELECT t.id,
            t.family_id,
            t.category_id,
            t.user_id,
            t.amount,
            t.transaction_date::text,
            t.description,
            c.name AS category_name,
            c.type AS category_type,
            COUNT(*) OVER() AS total_count
     FROM transaction t
     JOIN category c
       ON c.id = t.category_id
      AND c.family_id = t.family_id
     WHERE ${filters.join(" AND ")}
     ORDER BY t.transaction_date DESC, t.id DESC
     ${pagination_clause}`,
    values,
  );

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const pagination = should_paginate
    ? {
        page,
        rows_per_page,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / rows_per_page),
      }
    : {
        page: 0,
        rows_per_page: total,
        total,
        total_pages: total === 0 ? 0 : 1,
      };

  return jsonSuccess(
    {
      rows: rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
      })),
      pagination,
    },
    {
      request_id,
      status: 200,
    },
  );
});

export const POST = withRouteContext(
  async ({ request, family, user, request_id }) => {
    if (!family || !user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const raw_body = (await request.json()) as Record<string, unknown>;
    const parsed_body = create_transaction_schema.safeParse(
      normalizeTransactionPayload(raw_body),
    );

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const { category_id, amount, transaction_date, description } =
      parsed_body.data;

    const category = await scopedOneOrNone<{ id: string }>(
      family.family_id,
      `SELECT id
     FROM category
     WHERE family_id = $1
       AND id = $2`,
      [category_id],
    );

    requireFoundInFamily(category, "Category");

    const created = await db.one<{
      id: string;
      family_id: string;
      category_id: string;
      user_id: string;
      amount: number | string;
      transaction_date: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO transaction (family_id, category_id, user_id, amount, transaction_date, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id,
               family_id,
               category_id,
               user_id,
               amount,
               transaction_date::text,
               description,
               created_at,
               updated_at`,
      [
        family.family_id,
        category_id,
        user.user_id,
        amount,
        transaction_date,
        description,
      ],
    );

    return jsonSuccess(
      {
        ...created,
        amount: Number(created.amount),
      },
      {
        request_id,
        status: 201,
      },
    );
  },
);

export const PATCH = withRouteContext(
  async ({ request, family, request_id }) => {
    if (!family) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const raw_body = (await request.json()) as Record<string, unknown>;
    const parsed_body = update_transaction_schema.safeParse(
      normalizeTransactionPayload(raw_body),
    );

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const { id, category_id, amount, transaction_date, description } =
      parsed_body.data;

    const existing = await scopedOneOrNone<{ id: string }>(
      family.family_id,
      `SELECT id
     FROM transaction
     WHERE family_id = $1
       AND id = $2`,
      [id],
    );

    requireFoundInFamily(existing, "Transaction");

    if (category_id !== undefined) {
      const category = await scopedOneOrNone<{ id: string }>(
        family.family_id,
        `SELECT id
       FROM category
       WHERE family_id = $1
         AND id = $2`,
        [category_id],
      );

      requireFoundInFamily(category, "Category");
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (category_id !== undefined) {
      values.push(category_id);
      updates.push(`category_id = $${values.length}`);
    }

    if (amount !== undefined) {
      values.push(amount);
      updates.push(`amount = $${values.length}`);
    }

    if (transaction_date !== undefined) {
      values.push(transaction_date);
      updates.push(`transaction_date = $${values.length}`);
    }

    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }

    updates.push("updated_at = NOW()");

    values.push(id, family.family_id);
    const id_index = values.length - 1;
    const family_index = values.length;

    const updated = await db.one<{
      id: string;
      family_id: string;
      category_id: string;
      user_id: string;
      amount: number | string;
      transaction_date: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `UPDATE transaction
     SET ${updates.join(", ")}
     WHERE id = $${id_index}
       AND family_id = $${family_index}
     RETURNING id,
               family_id,
               category_id,
               user_id,
               amount,
               transaction_date::text,
               description,
               created_at,
               updated_at`,
      values,
    );

    return jsonSuccess(
      {
        ...updated,
        amount: Number(updated.amount),
      },
      {
        request_id,
        status: 200,
      },
    );
  },
);

export const DELETE = withRouteContext(async ({ request, family }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed_query = transaction_delete_query_schema.safeParse(
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

  const deleted = await db.result(
    `DELETE FROM transaction
     WHERE id = $1
       AND family_id = $2`,
    [parsed_query.data.id, family.family_id],
  );

  if (deleted.rowCount === 0) {
    throw new ApiError(404, "NOT_FOUND", "Transaction not found");
  }

  return jsonNoContent();
});
