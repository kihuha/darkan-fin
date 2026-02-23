import crypto from "crypto";
import { prisma } from "@/lib/prisma";
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

    const parsed_body = family_invite_token_schema.safeParse(
      await request.json(),
    );

    if (!parsed_body.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Invite token is invalid",
        parsed_body.error.issues,
      );
    }

    const token_hash = hashToken(parsed_body.data.token);

    // Find valid invite
    const invite = await prisma.family_invite.findFirst({
      where: {
        token_hash,
        status: "pending",
        expires_at: {
          gt: new Date(),
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

    // Check if user already belongs to a family
    const existing_member = await prisma.family_member.findUnique({
      where: {
        user_id: user.user_id,
      },
    });

    if (existing_member) {
      throw new ApiError(409, "CONFLICT", "You already belong to a family");
    }

    // Accept invite in transaction
    await prisma.$transaction(async (tx) => {
      await tx.family_member.create({
        data: {
          family_id: invite.family_id,
          user_id: user.user_id,
          role: "member",
        },
      });

      await tx.family_invite.update({
        where: {
          id: invite.id,
        },
        data: {
          status: "accepted",
        },
      });
    });

    logInfo("family_invite.accepted", {
      request_id,
      invite_id: invite.id.toString(),
      family_id: invite.family_id.toString(),
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
