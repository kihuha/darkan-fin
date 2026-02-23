import crypto from "crypto";
import { prisma } from "@/lib/prisma";
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

    // Check if user is already a member
    const member = await prisma.family_member.findFirst({
      where: {
        family_id: BigInt(family.family_id),
        user: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
      },
    });

    if (member) {
      throw new ApiError(
        409,
        "CONFLICT",
        "This email is already in your family",
      );
    }

    // Mark expired invites
    await prisma.family_invite.updateMany({
      where: {
        family_id: BigInt(family.family_id),
        email: {
          equals: email,
          mode: "insensitive",
        },
        status: "pending",
        expires_at: {
          lte: new Date(),
        },
      },
      data: {
        status: "expired",
      },
    });

    // Check for pending invite
    const pending_invite = await prisma.family_invite.findFirst({
      where: {
        family_id: BigInt(family.family_id),
        email: {
          equals: email,
          mode: "insensitive",
        },
        status: "pending",
        expires_at: {
          gt: new Date(),
        },
      },
    });

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

    // Create invite
    const invite = await prisma.family_invite.create({
      data: {
        family_id: BigInt(family.family_id),
        email,
        token_hash,
        invited_by_user_id: user.user_id,
        expires_at,
      },
    });

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
        invite: {
          id: invite.id.toString(),
          email: invite.email,
          status: invite.status as
            | "pending"
            | "accepted"
            | "revoked"
            | "expired",
          expires_at: invite.expires_at.toISOString(),
          created_at: invite.created_at.toISOString(),
        },
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
