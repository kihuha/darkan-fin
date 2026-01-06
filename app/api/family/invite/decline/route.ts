import crypto from "crypto";
import db from "@/utils/db";
import { family_invite_token_schema } from "@/lib/validations/family";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { requireEnv } from "@/utils/server/env";

function hashToken(token: string) {
  const invite_token_pepper = requireEnv("INVITE_TOKEN_PEPPER");

  return crypto
    .createHash("sha256")
    .update(`${token}${invite_token_pepper}`)
    .digest("hex");
}

export const POST = withRouteContext(
  async ({ request, user, request_id }) => {
    if (!user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const parsed_body = family_invite_token_schema.safeParse(await request.json());

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Invite token is invalid",
        parsed_body.error.issues,
      );
    }

    const token_hash = hashToken(parsed_body.data.token);

    const invite = await db.oneOrNone<{ id: string; email: string }>(
      `SELECT id, email
       FROM family_invite
       WHERE token_hash = $1
         AND status = 'pending'
         AND expires_at > NOW()`,
      [token_hash],
    );

    if (!invite) {
      throw new ApiError(404, "NOT_FOUND", "Invite is invalid or expired");
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiError(403, "FORBIDDEN", "Invite does not match this account");
    }

    await db.none(
      `UPDATE family_invite
       SET status = 'revoked',
           updated_at = NOW()
       WHERE id = $1`,
      [invite.id],
    );

    return jsonSuccess(
      {
        message: "Invite declined",
      },
      {
        request_id,
        status: 200,
      },
    );
  },
  {
    auth: "user",
  },
);
