import { prisma } from "@/lib/prisma";
import {
  budget_query_schema,
  create_budget_schema,
} from "@/lib/validations/budget";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";

type CategoryWithItem = {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  category_amount: number;
  repeats: boolean;
  amount: number;
  budget_item_id?: string;
};

function to_number(
  value: string | number | null | { toNumber?: () => number },
): number {
  if (value === null) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
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

  // Find or create budget
  let budget = await prisma.budget.findFirst({
    where: {
      family_id: BigInt(family.family_id),
      month,
      year,
    },
  });

  if (!budget) {
    budget = await prisma.budget.create({
      data: {
        family_id: BigInt(family.family_id),
        month,
        year,
      },
    });
  }

  // Get all categories for the family
  const categories = await prisma.category.findMany({
    where: {
      family_id: BigInt(family.family_id),
    },
    orderBy: [{ type: "desc" }, { name: "asc" }],
  });

  // Get budget items for this budget
  const items = await prisma.budget_item.findMany({
    where: {
      family_id: BigInt(family.family_id),
      budget_id: budget.id,
    },
  });

  // Map items by category ID for quick lookup
  const items_by_category = new Map(
    items.map((item) => [item.category_id.toString(), item]),
  );

  // Build response payload
  const payload = {
    id: budget.id.toString(),
    month: budget.month,
    year: budget.year,
    created_at: budget.created_at.toISOString(),
    updated_at: budget.updated_at.toISOString(),
    categories: categories.map((category): CategoryWithItem => {
      const existing_item = items_by_category.get(category.id.toString());
      const category_amount = to_number(category.amount);

      return {
        category_id: category.id.toString(),
        category_name: category.name,
        category_type: category.type as "income" | "expense",
        category_amount,
        repeats: category.repeats,
        amount: existing_item
          ? to_number(existing_item.amount)
          : category.repeats
            ? category_amount
            : 0,
        budget_item_id: existing_item?.id.toString(),
      };
    }),
  };

  return jsonSuccess(payload, {
    request_id,
    status: 200,
  });
});

export const POST = withRouteContext(
  async ({ request, request_id, family }) => {
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

    await prisma.$transaction(async (tx) => {
      // Find or create budget
      let budget = await tx.budget.findFirst({
        where: {
          family_id: BigInt(family.family_id),
          month,
          year,
        },
      });

      if (!budget) {
        budget = await tx.budget.create({
          data: {
            family_id: BigInt(family.family_id),
            month,
            year,
          },
        });
      }

      // Validate all categories exist and belong to the family
      const category_ids = Array.from(
        new Set(items.map((item) => BigInt(item.category_id))),
      );

      if (category_ids.length > 0) {
        const valid_categories = await tx.category.findMany({
          where: {
            family_id: BigInt(family.family_id),
            id: { in: category_ids },
          },
          select: { id: true },
        });

        if (valid_categories.length !== category_ids.length) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "One or more categories are invalid",
          );
        }
      }

      // Upsert budget items
      for (const item of items) {
        await tx.budget_item.upsert({
          where: {
            budget_id_category_id: {
              budget_id: budget.id,
              category_id: BigInt(item.category_id),
            },
          },
          update: {
            amount: item.amount,
          },
          create: {
            budget_id: budget.id,
            category_id: BigInt(item.category_id),
            amount: item.amount,
            family_id: BigInt(family.family_id),
          },
        });
      }
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
  },
);
