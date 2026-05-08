import { prisma } from "@/lib/prisma";
import {
  goal_path_param_schema,
  update_goal_schema,
} from "@/lib/validations/goal";
import { jsonNoContent, jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { serialize_goal } from "@/utils/services/goal-service";

function parse_goal_id_from_url(url: string): number {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const parsed = goal_path_param_schema.safeParse({ id: last });

  if (!parsed.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid goal id",
      parsed.error.issues,
    );
  }

  return parsed.data.id;
}

export const PATCH = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const goal_id = parse_goal_id_from_url(request.url);

  const parsed_body = update_goal_schema.safeParse({
    ...(await request.json()),
    id: goal_id,
  });

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

  const existing = await prisma.savings_goal.findFirst({
    where: {
      id: BigInt(goal_id),
      family_id: BigInt(family.family_id),
    },
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Goal not found in family");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (is_primary === true) {
      await tx.savings_goal.updateMany({
        where: {
          family_id: BigInt(family.family_id),
          is_primary: true,
          archived_at: null,
          id: { not: BigInt(goal_id) },
        },
        data: {
          is_primary: false,
        },
      });
    }

    return tx.savings_goal.update({
      where: { id: BigInt(goal_id) },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(target_amount !== undefined ? { target_amount } : {}),
        ...(target_date !== undefined
          ? { target_date: new Date(target_date) }
          : {}),
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
        ...(is_primary !== undefined ? { is_primary } : {}),
      },
    });
  });

  return jsonSuccess(serialize_goal(updated), {
    request_id,
    status: 200,
  });
});

export const DELETE = withRouteContext(async ({ request, family }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const goal_id = parse_goal_id_from_url(request.url);

  const result = await prisma.savings_goal.deleteMany({
    where: {
      id: BigInt(goal_id),
      family_id: BigInt(family.family_id),
    },
  });

  if (result.count === 0) {
    throw new ApiError(404, "NOT_FOUND", "Goal not found in family");
  }

  return jsonNoContent();
});
