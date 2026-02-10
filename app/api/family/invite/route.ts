import crypto from "crypto";
import db from "@/utils/db";
import { family_invite_schema } from "@/lib/validations/family";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { requireEnv } from "@/utils/server/env";
import { logInfo } from "@/utils/server/logger";

const INVITE_EXPIRY_DAYS = 7;

function hashToken(token: string) {
  const invite_token_pepper = requireEnv("INVITE_TOKEN_PEPPER");

  return crypto
    .createHash("sha256")
    .update(`${token}${invite_token_pepper}`)
    .digest("hex");
}

function buildInviteLink(token: string) {
  const app_url = requireEnv("APP_URL");
  return `${app_url.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(token)}`;
}

export const POST = withRouteContext(
  async ({ request, request_id, family, user }) => {
    if (!family || !user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    const parsed_body = family_invite_schema.safeParse(await request.json());

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_body.error.issues,
      );
    }

    const email = parsed_body.data.email;

    const member = await db.oneOrNone<{ id: string }>(
      `SELECT fm.id
       FROM family_member fm
       JOIN "user" u ON u.id = fm.user_id
       WHERE fm.family_id = $1
         AND LOWER(u.email) = $2`,
      [family.family_id, email],
    );

    if (member) {
      throw new ApiError(409, "CONFLICT", "This email is already in your family");
    }

    await db.none(
      `UPDATE family_invite
       SET status = 'expired',
           updated_at = NOW()
       WHERE family_id = $1
         AND LOWER(email) = $2
         AND status = 'pending'
         AND expires_at <= NOW()`,
      [family.family_id, email],
    );

    const pending_invite = await db.oneOrNone<{ id: string }>(
      `SELECT id
       FROM family_invite
       WHERE family_id = $1
         AND LOWER(email) = $2
         AND status = 'pending'
         AND expires_at > NOW()`,
      [family.family_id, email],
    );

    if (pending_invite) {
      throw new ApiError(
        409,
        "CONFLICT",
        "An invite is already pending for this email",
      );
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const token_hash = hashToken(token);
    const expires_at = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const invite = await db.one<{
      id: string;
      email: string;
      status: "pending" | "accepted" | "revoked" | "expired";
      expires_at: string;
      created_at: string;
    }>(
      `INSERT INTO family_invite (family_id, email, token_hash, invited_by_user_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, status, expires_at, created_at`,
      [family.family_id, email, token_hash, user.user_id, expires_at],
    );

    const invite_link = buildInviteLink(token);

    logInfo("family_invite.created", {
      request_id,
      family_id: family.family_id,
      invited_by_user_id: user.user_id,
      invite_id: invite.id,
      email,
    });

    return jsonSuccess(
      {
        invite,
        invite_link,
      },
      {
        request_id,
        status: 201,
      },
    );
  },
  {
    auth: "admin",
  },
);
