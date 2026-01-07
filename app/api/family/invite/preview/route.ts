import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/utils/db";
import { ApiError, requireUser } from "@/utils/auth-helpers";
import { familyInviteTokenSchema } from "@/lib/validations/family";

function hashToken(token: string) {
  const pepper = process.env.INVITE_TOKEN_PEPPER;

  if (!pepper) {
    throw new ApiError(500, "INVITE_TOKEN_PEPPER is not configured");
  }

  return crypto.createHash("sha256").update(`${token}${pepper}`).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request.headers);
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    const validationResult = familyInviteTokenSchema.safeParse({ token });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invite token is invalid",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(validationResult.data.token);

    await db.none(
      `UPDATE family_invite
       SET status = 'expired', updated_at = NOW()
       WHERE token_hash = $1
         AND status = 'pending'
         AND expires_at <= NOW()`,
      [tokenHash]
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
              f.name as family_name,
              u.email as inviter_email
       FROM family_invite fi
       JOIN family f ON f.id = fi.family_id
       JOIN "user" u ON u.id = fi.invited_by_user_id
       WHERE fi.token_hash = $1
         AND fi.status = 'pending'
         AND fi.expires_at > NOW()`,
      [tokenHash]
    );

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invite is invalid or expired" },
        { status: 404 }
      );
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Invite does not match this account" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          familyName: invite.family_name,
          inviterEmail: invite.inviter_email,
          expiresAt: invite.expires_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error previewing invite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load invite" },
      { status: 500 }
    );
  }
}
