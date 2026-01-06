import crypto from "crypto";
import db from "@/utils/db";
import { family_invite_token_schema } from "@/lib/validations/family";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { requireEnv } from "@/utils/server/env";
import { logInfo } from "@/utils/server/logger";

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

    const invite = await db.oneOrNone<{
      id: string;
      family_id: string;
      email: string;
      expires_at: string;
    }>(
      `SELECT id, family_id, email, expires_at
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

    const existing_member = await db.oneOrNone<{ family_id: string }>(
      `SELECT family_id
       FROM family_member
       WHERE user_id = $1`,
      [user.user_id],
    );

    if (existing_member) {
      throw new ApiError(409, "CONFLICT", "You already belong to a family");
    }

    await db.tx(async (tx) => {
      await tx.none(
        `INSERT INTO family_member (family_id, user_id, role)
         VALUES ($1, $2, 'member')`,
        [invite.family_id, user.user_id],
      );

      await tx.none(
        `UPDATE family_invite
         SET status = 'accepted',
             updated_at = NOW()
         WHERE id = $1`,
        [invite.id],
      );
    });

    logInfo("family_invite.accepted", {
      request_id,
      invite_id: invite.id,
      family_id: invite.family_id,
      user_id: user.user_id,
    });

    return jsonSuccess(
      {
        message: "Invite accepted",
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
