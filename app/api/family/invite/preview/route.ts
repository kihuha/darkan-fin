import crypto from "crypto";
import { prisma } from "@/lib/prisma";
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

    // Mark expired invites
    await prisma.family_invite.updateMany({
      where: {
        token_hash,
        status: "pending",
        expires_at: {
          lte: new Date(),
        },
      },
      data: {
        status: "expired",
      },
    });

    // Find valid invite
    const invite = await prisma.family_invite.findFirst({
      where: {
        token_hash,
        status: "pending",
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        family: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!invite) {
      throw new ApiError(404, "NOT_FOUND", "Invite is invalid or expired");
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Invite does not match this account",
      );
    }

    return jsonSuccess(
      {
        family_name: invite.family.name,
        inviter_email: invite.user.email,
        expires_at: invite.expires_at.toISOString(),
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
