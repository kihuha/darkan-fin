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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request.headers);
    const body = await request.json();
    const validationResult = familyInviteTokenSchema.safeParse(body);

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

    const existingMember = await db.oneOrNone(
      "SELECT family_id FROM family_member WHERE user_id = $1",
      [user.userId]
    );

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "You already belong to a family" },
        { status: 409 }
      );
    }

    await db.tx(async (tx) => {
      await tx.none(
        `INSERT INTO family_member (family_id, user_id, role)
         VALUES ($1, $2, 'member')`,
        [invite.family_id, user.userId]
      );

      await tx.none(
        `UPDATE family_invite
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1`,
        [invite.id]
      );
    });

    return NextResponse.json(
      { success: true, message: "Invite accepted" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
