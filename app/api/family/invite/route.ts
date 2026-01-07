import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/utils/db";
import { ApiError, assertAdmin, requireFamilyContext } from "@/utils/auth-helpers";
import { familyInviteSchema } from "@/lib/validations/family";

const INVITE_EXPIRY_DAYS = 7;

function buildInviteLink(token: string) {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new ApiError(500, "APP_URL is not configured");
  }

  return `${appUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(
    token
  )}`;
}

function hashToken(token: string) {
  const pepper = process.env.INVITE_TOKEN_PEPPER;

  if (!pepper) {
    throw new ApiError(500, "INVITE_TOKEN_PEPPER is not configured");
  }

  return crypto.createHash("sha256").update(`${token}${pepper}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireFamilyContext(request.headers);
    assertAdmin(context);

    const body = await request.json();
    const validationResult = familyInviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const email = validationResult.data.email.toLowerCase();

    const member = await db.oneOrNone(
      `SELECT fm.id
       FROM family_member fm
       JOIN "user" u ON u.id = fm.user_id
       WHERE fm.family_id = $1 AND LOWER(u.email) = $2`,
      [context.familyId, email]
    );

    if (member) {
      return NextResponse.json(
        { success: false, error: "This email is already in your family" },
        { status: 409 }
      );
    }

    await db.none(
      `UPDATE family_invite
       SET status = 'expired', updated_at = NOW()
       WHERE family_id = $1
         AND LOWER(email) = $2
         AND status = 'pending'
         AND expires_at <= NOW()`,
      [context.familyId, email]
    );

    const pendingInvite = await db.oneOrNone(
      `SELECT id
       FROM family_invite
       WHERE family_id = $1
         AND LOWER(email) = $2
         AND status = 'pending'
         AND expires_at > NOW()`,
      [context.familyId, email]
    );

    if (pendingInvite) {
      return NextResponse.json(
        { success: false, error: "An invite is already pending for this email" },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const invite = await db.one(
      `INSERT INTO family_invite (family_id, email, token_hash, invited_by_user_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, status, expires_at, created_at`,
      [context.familyId, email, tokenHash, context.userId, expiresAt]
    );

    const inviteLink = buildInviteLink(token);

    return NextResponse.json(
      {
        success: true,
        data: {
          invite,
          inviteLink,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
