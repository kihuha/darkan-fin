import { prisma } from "@/lib/prisma";
import { create_goal_schema } from "@/lib/validations/goal";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { serialize_goal } from "@/utils/services/goal-service";

export const GET = withRouteContext(async ({ family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const goals = await prisma.savings_goal.findMany({
    where: {
      family_id: BigInt(family.family_id),
      archived_at: null,
    },
    orderBy: [{ is_primary: "desc" }, { target_date: "asc" }, { id: "asc" }],
  });

  return jsonSuccess(goals.map(serialize_goal), {
    request_id,
    status: 200,
  });
});

export const POST = withRouteContext(
  async ({ request, family, user, request_id }) => {
    if (!family || !user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const parsed_body = create_goal_schema.safeParse(await request.json());

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const { name, target_amount, target_date, notes, is_primary } =
      parsed_body.data;

    const target_date_value = new Date(target_date);

    const created = await prisma.$transaction(async (tx) => {
      if (is_primary) {
        await tx.savings_goal.updateMany({
          where: {
            family_id: BigInt(family.family_id),
            is_primary: true,
            archived_at: null,
          },
          data: {
            is_primary: false,
          },
        });
      }

      return tx.savings_goal.create({
        data: {
          family_id: BigInt(family.family_id),
          created_by_user_id: user.user_id,
          name,
          target_amount,
          target_date: target_date_value,
          notes: notes ?? null,
          is_primary: Boolean(is_primary),
        },
      });
    });

    return jsonSuccess(serialize_goal(created), {
      request_id,
      status: 201,
    });
  },
);
