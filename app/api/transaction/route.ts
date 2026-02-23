import { prisma } from "@/lib/prisma";
import {
  create_transaction_schema,
  transaction_delete_query_schema,
  transaction_query_schema,
  update_transaction_schema,
} from "@/lib/validations/transaction";
import { ApiError } from "@/utils/errors";
import { jsonNoContent, jsonSuccess } from "@/utils/api-response";
import { withRouteContext } from "@/utils/route";

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

  // Build where clause for Prisma
  const where: any = {
    family_id: BigInt(family.family_id),
  };

  // Add date filtering if month and year are provided
  if (month !== undefined && year !== undefined) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    where.transaction_date = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Get total count
  const total = await prisma.transaction.count({ where });

  // Fetch transactions with category information
  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: {
        select: {
          name: true,
          type: true,
        },
      },
    },
    orderBy: [{ transaction_date: "desc" }, { id: "desc" }],
    ...(should_paginate
      ? {
          skip: page * rows_per_page,
          take: rows_per_page,
        }
      : {}),
  });

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

  // Format the response to match the expected structure
  const rows = transactions.map((t) => ({
    id: t.id.toString(),
    family_id: t.family_id.toString(),
    category_id: t.category_id.toString(),
    user_id: t.user_id,
    amount: Number(t.amount),
    transaction_date: t.transaction_date.toISOString().split("T")[0],
    description: t.description,
    category_name: t.category.name,
    category_type: t.category.type as "income" | "expense",
  }));

  return jsonSuccess(
    {
      rows,
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

    // Verify the category exists and belongs to the family
    const category = await prisma.category.findFirst({
      where: {
        id: BigInt(category_id),
        family_id: BigInt(family.family_id),
      },
    });

    if (!category) {
      throw new ApiError(404, "NOT_FOUND", "Category not found in family");
    }

    // Create the transaction
    const created = await prisma.transaction.create({
      data: {
        family_id: BigInt(family.family_id),
        category_id: BigInt(category_id),
        user_id: user.user_id,
        amount,
        transaction_date: new Date(transaction_date),
        description,
      },
    });

    return jsonSuccess(
      {
        id: created.id.toString(),
        family_id: created.family_id.toString(),
        category_id: created.category_id.toString(),
        user_id: created.user_id,
        amount: Number(created.amount),
        transaction_date: created.transaction_date.toISOString().split("T")[0],
        description: created.description,
        created_at: created.created_at.toISOString(),
        updated_at: created.updated_at.toISOString(),
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

    // Verify the transaction exists and belongs to the family
    const existing = await prisma.transaction.findFirst({
      where: {
        id: BigInt(id),
        family_id: BigInt(family.family_id),
      },
    });

    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Transaction not found in family");
    }

    // If category_id is being updated, verify it exists and belongs to the family
    if (category_id !== undefined) {
      const category = await prisma.category.findFirst({
        where: {
          id: BigInt(category_id),
          family_id: BigInt(family.family_id),
        },
      });

      if (!category) {
        throw new ApiError(404, "NOT_FOUND", "Category not found in family");
      }
    }

    // Build the update data object
    const updateData: any = {};
    if (category_id !== undefined) updateData.category_id = BigInt(category_id);
    if (amount !== undefined) updateData.amount = amount;
    if (transaction_date !== undefined)
      updateData.transaction_date = new Date(transaction_date);
    if (description !== undefined) updateData.description = description;

    // Update the transaction and include category information
    const updated = await prisma.transaction.update({
      where: {
        id: BigInt(id),
      },
      data: updateData,
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });

    return jsonSuccess(
      {
        id: updated.id.toString(),
        family_id: updated.family_id.toString(),
        category_id: updated.category_id.toString(),
        user_id: updated.user_id,
        amount: Number(updated.amount),
        transaction_date: updated.transaction_date.toISOString().split("T")[0],
        description: updated.description,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
        category_name: updated.category.name,
        category_type: updated.category.type as "income" | "expense",
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

  // Use deleteMany to delete with compound conditions
  const result = await prisma.transaction.deleteMany({
    where: {
      id: BigInt(parsed_query.data.id),
      family_id: BigInt(family.family_id),
    },
  });

  if (result.count === 0) {
    throw new ApiError(404, "NOT_FOUND", "Transaction not found");
  }

  return jsonNoContent();
});
