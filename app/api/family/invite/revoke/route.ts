import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import { ApiError, assertAdmin, requireFamilyContext } from "@/utils/auth-helpers";
import { familyInviteRevokeSchema } from "@/lib/validations/family";

export async function POST(request: NextRequest) {
  try {
    const context = await requireFamilyContext(request.headers);
    assertAdmin(context);

    const body = await request.json();
    const validationResult = familyInviteRevokeSchema.safeParse(body);

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

    const { inviteId } = validationResult.data;

    const invite = await db.oneOrNone(
      `SELECT id
       FROM family_invite
       WHERE id = $1 AND family_id = $2 AND status = 'pending'`,
      [inviteId, context.familyId]
    );

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    await db.none(
      `UPDATE family_invite
       SET status = 'revoked', updated_at = NOW()
       WHERE id = $1`,
      [inviteId]
    );

    return NextResponse.json(
      { success: true, message: "Invite revoked" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error revoking invite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}
