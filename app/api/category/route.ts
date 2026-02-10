import { z } from "zod";
import db from "@/utils/db";
import {
  create_category_schema,
  update_category_schema,
} from "@/lib/validations/category";
import { findCategoryIdByTags } from "@/lib/category-recategorization";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { requireFoundInFamily, scopedOneOrNone } from "@/utils/db/scoped";

const category_delete_query_schema = z.object({
  id: z.coerce.number().int().positive(),
});

const category_action_query_schema = z.object({
  action: z.enum(["recategorize"]).optional(),
});

export const GET = withRouteContext(async ({ family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const categories = await db.any(
    `SELECT id,
            name,
            type,
            amount,
            repeats,
            description,
            tags,
            created_at,
            updated_at
     FROM category
     WHERE family_id = $1
     ORDER BY name ASC`,
    [family.family_id],
  );

  return jsonSuccess(categories, {
    request_id,
    status: 200,
  });
});

export const POST = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed_query = category_action_query_schema.safeParse(
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

  if (parsed_query.data.action === "recategorize") {
    const result = await recategorizeTransactions(family.family_id);
    return jsonSuccess(result, {
      request_id,
      status: 200,
    });
  }

  const parsed_body = create_category_schema.safeParse(await request.json());

  if (!parsed_body.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed_body.error.issues,
    );
  }

  const { name, type, amount, repeats, description, tags } = parsed_body.data;

  const existing = await scopedOneOrNone<{ id: string }>(
    family.family_id,
    `SELECT id
     FROM category
     WHERE family_id = $1
       AND LOWER(name) = LOWER($2)`,
    [name],
  );

  if (existing) {
    throw new ApiError(409, "CONFLICT", "A category with this name already exists");
  }

  const new_category = await db.one(
    `INSERT INTO category (family_id, name, type, amount, repeats, description, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id,
               name,
               type,
               amount,
               repeats,
               description,
               tags,
               created_at,
               updated_at`,
    [
      family.family_id,
      name,
      type,
      amount ?? 0,
      repeats,
      description,
      tags ?? [],
    ],
  );

  return jsonSuccess(new_category, {
    request_id,
    status: 201,
  });
});

export const PATCH = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed_body = update_category_schema.safeParse(await request.json());

  if (!parsed_body.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed_body.error.issues,
    );
  }

  const { id, name, type, amount, repeats, description, tags } = parsed_body.data;

  const existing = await scopedOneOrNone<{ id: string }>(
    family.family_id,
    `SELECT id
     FROM category
     WHERE family_id = $1
       AND id = $2`,
    [id],
  );

  requireFoundInFamily(existing, "Category");

  if (name) {
    const duplicate = await scopedOneOrNone<{ id: string }>(
      family.family_id,
      `SELECT id
       FROM category
       WHERE family_id = $1
         AND LOWER(name) = LOWER($2)
         AND id != $3`,
      [name, id],
    );

    if (duplicate) {
      throw new ApiError(409, "CONFLICT", "A category with this name already exists");
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) {
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (type !== undefined) {
    values.push(type);
    updates.push(`type = $${values.length}`);
  }

  if (amount !== undefined) {
    values.push(amount);
    updates.push(`amount = $${values.length}`);
  }

  if (repeats !== undefined) {
    values.push(repeats);
    updates.push(`repeats = $${values.length}`);
  }

  if (description !== undefined) {
    values.push(description);
    updates.push(`description = $${values.length}`);
  }

  if (tags !== undefined) {
    values.push(tags);
    updates.push(`tags = $${values.length}`);
  }

  updates.push("updated_at = NOW()");

  values.push(id, family.family_id);
  const id_index = values.length - 1;
  const family_index = values.length;

  const updated_category = await db.one(
    `UPDATE category
     SET ${updates.join(", ")}
     WHERE id = $${id_index}
       AND family_id = $${family_index}
     RETURNING id,
               name,
               type,
               amount,
               repeats,
               description,
               tags,
               created_at,
               updated_at`,
    values,
  );

  return jsonSuccess(updated_category, {
    request_id,
    status: 200,
  });
});

export const DELETE = withRouteContext(async ({ request, family }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const parsed_query = category_delete_query_schema.safeParse(
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

  const category_id = parsed_query.data.id;

  const category = await scopedOneOrNone<{ id: string; name: string }>(
    family.family_id,
    `SELECT id, name
     FROM category
     WHERE family_id = $1
       AND id = $2`,
    [category_id],
  );

  const scoped_category = requireFoundInFamily(category, "Category");

  if (scoped_category.name.toLowerCase() === "uncategorized") {
    throw new ApiError(400, "VALIDATION_ERROR", "Cannot delete the Uncategorized category");
  }

  let uncategorized = await scopedOneOrNone<{ id: string }>(
    family.family_id,
    `SELECT id
     FROM category
     WHERE family_id = $1
       AND LOWER(name) = 'uncategorized'`,
  );

  if (!uncategorized) {
    uncategorized = await db.one<{ id: string }>(
      `INSERT INTO category (family_id, name, type, amount, repeats, description)
       VALUES ($1, 'Uncategorized', 'expense', 0, false, 'Default category for uncategorized items')
       ON CONFLICT (family_id, LOWER(name))
       DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [family.family_id],
    );
  }

  await db.tx(async (tx) => {
    await tx.none(
      `UPDATE budget_item
       SET category_id = $1
       WHERE family_id = $2
         AND category_id = $3`,
      [uncategorized.id, family.family_id, category_id],
    );

    await tx.none(
      `UPDATE transaction
       SET category_id = $1
       WHERE family_id = $2
         AND category_id = $3`,
      [uncategorized.id, family.family_id, category_id],
    );

    await tx.none(
      `DELETE FROM category
       WHERE family_id = $1
         AND id = $2`,
      [family.family_id, category_id],
    );
  });

  return new Response(null, { status: 204 });
});

async function recategorizeTransactions(family_id: string) {
  return db.tx(async (tx) => {
    const categories = await tx.any(
      `SELECT id, name, tags
       FROM category
       WHERE family_id = $1`,
      [family_id],
    );

    const uncategorized = categories.find(
      (category: { name?: string }) =>
        category.name?.toLowerCase() === "uncategorized",
    );

    if (!uncategorized?.id) {
      throw new ApiError(
        500,
        "INTERNAL_ERROR",
        "Default Uncategorized category not found. Please run the database seed.",
      );
    }

    const matchable_categories = categories.filter(
      (category: { id: string | number }) => category.id !== uncategorized.id,
    );

    const transactions = await tx.any<{ id: string; description: string | null }>(
      `SELECT id, description
       FROM transaction
       WHERE family_id = $1
         AND category_id = $2`,
      [family_id, uncategorized.id],
    );

    let updated = 0;

    for (const transaction of transactions) {
      const next_category_id = findCategoryIdByTags(
        transaction.description,
        matchable_categories,
        uncategorized.id,
      );

      if (next_category_id !== uncategorized.id) {
        await tx.none(
          `UPDATE transaction
           SET category_id = $1,
               updated_at = NOW()
           WHERE family_id = $2
             AND id = $3`,
          [next_category_id, family_id, transaction.id],
        );

        updated += 1;
      }
    }

    return {
      updated,
      scanned: transactions.length,
    };
  });
}
