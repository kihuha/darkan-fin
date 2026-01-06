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

export const GET = withRouteContext(
  async ({ request, user, request_id }) => {
    if (!user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const parsed_query = family_invite_token_schema.safeParse({
      token: request.nextUrl.searchParams.get("token"),
    });

    if (!parsed_query.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Invite token is invalid",
        parsed_query.error.issues,
      );
    }

    const token_hash = hashToken(parsed_query.data.token);

    await db.none(
      `UPDATE family_invite
       SET status = 'expired',
           updated_at = NOW()
       WHERE token_hash = $1
         AND status = 'pending'
         AND expires_at <= NOW()`,
      [token_hash],
    );

    const invite = await db.oneOrNone<{
      id: string;
      email: string;
      status: string;
      expires_at: string;
      family_name: string | null;
      inviter_email: string;
    }>(
      `SELECT fi.id,
              fi.email,
              fi.status,
              fi.expires_at,
              f.name AS family_name,
              u.email AS inviter_email
       FROM family_invite fi
       JOIN family f ON f.id = fi.family_id
       JOIN "user" u ON u.id = fi.invited_by_user_id
       WHERE fi.token_hash = $1
         AND fi.status = 'pending'
         AND fi.expires_at > NOW()`,
      [token_hash],
    );

    if (!invite) {
      throw new ApiError(404, "NOT_FOUND", "Invite is invalid or expired");
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiError(403, "FORBIDDEN", "Invite does not match this account");
    }

    return jsonSuccess(
      {
        family_name: invite.family_name,
        inviter_email: invite.inviter_email,
        expires_at: invite.expires_at,
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
