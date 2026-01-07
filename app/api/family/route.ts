import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import { ApiError, requireFamilyContext } from "@/utils/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const { familyId, role } = await requireFamilyContext(request.headers);

    await db.none(
      `UPDATE family_invite
       SET status = 'expired', updated_at = NOW()
       WHERE family_id = $1
         AND status = 'pending'
         AND expires_at <= NOW()`,
      [familyId]
    );

    const family = await db.one(
      `SELECT id, name
       FROM family
       WHERE id = $1`,
      [familyId]
    );

    const members = await db.any(
      `SELECT fm.id,
              fm.user_id,
              fm.role,
              fm.created_at,
              u.name,
              u.email
       FROM family_member fm
       JOIN "user" u ON u.id = fm.user_id
       WHERE fm.family_id = $1
       ORDER BY fm.created_at ASC`,
      [familyId]
    );

    const invites =
      role === "admin"
        ? await db.any(
            `SELECT id, email, status, expires_at, created_at
             FROM family_invite
             WHERE family_id = $1 AND status = 'pending'
             ORDER BY created_at DESC`,
            [familyId]
          )
        : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          family,
          role,
          members,
          invites,
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
    console.error("Error fetching family settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch family settings" },
      { status: 500 }
    );
  }
}
