import { prisma } from "@/lib/prisma";
import { family_invite_revoke_schema } from "@/lib/validations/family";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";

export const POST = withRouteContext(
  async ({ request, family, request_id }) => {
    if (!family) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const parsed_body = family_invite_revoke_schema.safeParse(
      await request.json(),
    );

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const { invite_id } = parsed_body.data;

    // Find invite
    const invite = await prisma.family_invite.findFirst({
      where: {
        id: BigInt(invite_id),
        family_id: BigInt(family.family_id),
        status: "pending",
      },
    });

    if (!invite) {
      throw new ApiError(404, "NOT_FOUND", "Invite not found");
    }

    // Revoke invite
    await prisma.family_invite.update({
      where: {
        id: BigInt(invite_id),
      },
      data: {
        status: "revoked",
      },
    });

    return jsonSuccess(
      {
        message: "Invite revoked",
      },
      {
        request_id,
        status: 200,
      },
    );
  },
  {
    auth: "admin",
  },
);
