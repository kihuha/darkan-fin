import db from "@/utils/db";
import { family_invite_revoke_schema } from "@/lib/validations/family";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";

export const POST = withRouteContext(
  async ({ request, family, request_id }) => {
    if (!family) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const parsed_body = family_invite_revoke_schema.safeParse(await request.json());

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const { invite_id } = parsed_body.data;

    const invite = await db.oneOrNone<{ id: string }>(
      `SELECT id
       FROM family_invite
       WHERE id = $1
         AND family_id = $2
         AND status = 'pending'`,
      [invite_id, family.family_id],
    );

    if (!invite) {
      throw new ApiError(404, "NOT_FOUND", "Invite not found");
    }

    await db.none(
      `UPDATE family_invite
       SET status = 'revoked',
           updated_at = NOW()
       WHERE id = $1`,
      [invite_id],
    );

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
