import { prisma } from "@/lib/prisma";
import { goal_path_param_schema } from "@/lib/validations/goal";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { serialize_goal } from "@/utils/services/goal-service";

function parse_goal_id_from_url(url: string): number {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  // .../api/goal/{id}/primary
  const id_segment = segments[segments.length - 2];
  const parsed = goal_path_param_schema.safeParse({ id: id_segment });

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

export const POST = withRouteContext(async ({ request, family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  const goal_id = parse_goal_id_from_url(request.url);

  const existing = await prisma.savings_goal.findFirst({
    where: {
      id: BigInt(goal_id),
      family_id: BigInt(family.family_id),
      archived_at: null,
    },
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Goal not found in family");
  }

  const updated = await prisma.$transaction(async (tx) => {
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

    return tx.savings_goal.update({
      where: { id: BigInt(goal_id) },
      data: { is_primary: true },
    });
  });

  return jsonSuccess(serialize_goal(updated), {
    request_id,
    status: 200,
  });
});
