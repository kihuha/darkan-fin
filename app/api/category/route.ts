import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  create_category_schema,
  update_category_schema,
} from "@/lib/validations/category";
import { findCategoryIdByTags } from "@/lib/category-recategorization";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";

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

  const categories = await prisma.category.findMany({
    where: {
      family_id: BigInt(family.family_id),
    },
    orderBy: {
      name: "asc",
    },
  });

  // Format response
  const formatted_categories = categories.map((cat) => ({
    id: cat.id.toString(),
    name: cat.name,
    type: cat.type,
    amount: Number(cat.amount),
    repeats: cat.repeats,
    description: cat.description,
    tags: cat.tags,
    created_at: cat.created_at.toISOString(),
    updated_at: cat.updated_at.toISOString(),
  }));

  return jsonSuccess(formatted_categories, {
    request_id,
    status: 200,
  });
});

export const POST = withRouteContext(
  async ({ request, family, request_id }) => {
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

    // Check if category with same name exists (case-insensitive)
    const existing = await prisma.category.findFirst({
      where: {
        family_id: BigInt(family.family_id),
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      throw new ApiError(
        409,
        "CONFLICT",
        "A category with this name already exists",
      );
    }

    // Create new category
    const new_category = await prisma.category.create({
      data: {
        family_id: BigInt(family.family_id),
        name,
        type,
        amount: amount ?? 0,
        repeats,
        description,
        tags: tags ?? [],
      },
    });

    return jsonSuccess(
      {
        id: new_category.id.toString(),
        name: new_category.name,
        type: new_category.type,
        amount: Number(new_category.amount),
        repeats: new_category.repeats,
        description: new_category.description,
        tags: new_category.tags,
        created_at: new_category.created_at.toISOString(),
        updated_at: new_category.updated_at.toISOString(),
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

    const parsed_body = update_category_schema.safeParse(await request.json());

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const { id, name, type, amount, repeats, description, tags } =
      parsed_body.data;

    // Verify category exists and belongs to family
    const existing = await prisma.category.findFirst({
      where: {
        id: BigInt(id),
        family_id: BigInt(family.family_id),
      },
    });

    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Category not found in family");
    }

    // Check for duplicate name (case-insensitive)
    if (name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          family_id: BigInt(family.family_id),
          name: {
            equals: name,
            mode: "insensitive",
          },
          id: { not: BigInt(id) },
        },
      });

      if (duplicate) {
        throw new ApiError(
          409,
          "CONFLICT",
          "A category with this name already exists",
        );
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      type?: string;
      amount?: number;
      repeats?: boolean;
      description?: string | null;
      tags?: string[];
    } = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (repeats !== undefined) updateData.repeats = repeats;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    // Update the category
    const updated_category = await prisma.category.update({
      where: {
        id: BigInt(id),
      },
      data: updateData,
    });

    return jsonSuccess(
      {
        id: updated_category.id.toString(),
        name: updated_category.name,
        type: updated_category.type,
        amount: Number(updated_category.amount),
        repeats: updated_category.repeats,
        description: updated_category.description,
        tags: updated_category.tags,
        created_at: updated_category.created_at.toISOString(),
        updated_at: updated_category.updated_at.toISOString(),
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

  // Find the category
  const category = await prisma.category.findFirst({
    where: {
      id: BigInt(category_id),
      family_id: BigInt(family.family_id),
    },
  });

  if (!category) {
    throw new ApiError(404, "NOT_FOUND", "Category not found in family");
  }

  if (category.name.toLowerCase() === "uncategorized") {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Cannot delete the Uncategorized category",
    );
  }

  // Find or create uncategorized category
  let uncategorized = await prisma.category.findFirst({
    where: {
      family_id: BigInt(family.family_id),
      name: {
        equals: "uncategorized",
        mode: "insensitive",
      },
    },
  });

  if (!uncategorized) {
    uncategorized = await prisma.category.create({
      data: {
        family_id: BigInt(family.family_id),
        name: "Uncategorized",
        type: "expense",
        amount: 0,
        repeats: false,
        description: "Default category for uncategorized items",
      },
    });
  }

  // Use transaction to move items and delete category
  await prisma.$transaction(async (tx) => {
    // Update budget items
    await tx.budget_item.updateMany({
      where: {
        family_id: BigInt(family.family_id),
        category_id: BigInt(category_id),
      },
      data: {
        category_id: uncategorized.id,
      },
    });

    // Update transactions
    await tx.transaction.updateMany({
      where: {
        family_id: BigInt(family.family_id),
        category_id: BigInt(category_id),
      },
      data: {
        category_id: uncategorized.id,
      },
    });

    // Delete the category
    await tx.category.delete({
      where: {
        id: BigInt(category_id),
      },
    });
  });

  return new Response(null, { status: 204 });
});

async function recategorizeTransactions(family_id: string) {
  return prisma.$transaction(async (tx) => {
    // Get all categories
    const categories = await tx.category.findMany({
      where: {
        family_id: BigInt(family_id),
      },
      select: {
        id: true,
        name: true,
        tags: true,
      },
    });

    // Find uncategorized category
    const uncategorized = categories.find(
      (category) => category.name?.toLowerCase() === "uncategorized",
    );

    if (!uncategorized?.id) {
      throw new ApiError(
        500,
        "INTERNAL_ERROR",
        "Default Uncategorized category not found. Please run the database seed.",
      );
    }

    // Get matchable categories (exclude uncategorized)
    const matchable_categories = categories
      .filter((category) => category.id !== uncategorized.id)
      .map((cat) => ({
        id: cat.id.toString(),
        name: cat.name,
        tags: cat.tags,
      }));

    // Get uncategorized transactions
    const transactions = await tx.transaction.findMany({
      where: {
        family_id: BigInt(family_id),
        category_id: uncategorized.id,
      },
      select: {
        id: true,
        description: true,
      },
    });

    let updated = 0;

    // Recategorize each transaction
    for (const transaction of transactions) {
      const next_category_id = findCategoryIdByTags(
        transaction.description,
        matchable_categories,
        uncategorized.id.toString(),
      );

      if (next_category_id !== uncategorized.id.toString()) {
        await tx.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            category_id: BigInt(next_category_id),
          },
        });

        updated += 1;
      }
    }

    return {
      updated,
      scanned: transactions.length,
    };
  });
}
