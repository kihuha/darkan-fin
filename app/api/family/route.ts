import db from "@/utils/db";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";

export const GET = withRouteContext(async ({ family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  await db.none(
    `UPDATE family_invite
     SET status = 'expired',
         updated_at = NOW()
     WHERE family_id = $1
       AND status = 'pending'
       AND expires_at <= NOW()`,
    [family.family_id],
  );

  const family_record = await db.one<{ id: string; name: string | null }>(
    `SELECT id, name
     FROM family
     WHERE id = $1`,
    [family.family_id],
  );

  const members = await db.any<{
    id: string;
    user_id: string;
    role: "admin" | "member";
    created_at: string;
    name: string;
    email: string;
  }>(
    `SELECT fm.id,
            fm.user_id,
            fm.role,
            fm.created_at,
            u.name,
            u.email
     FROM family_member fm
     JOIN "user" u
       ON u.id = fm.user_id
     WHERE fm.family_id = $1
     ORDER BY fm.created_at ASC`,
    [family.family_id],
  );

  const invites =
    family.role === "admin"
      ? await db.any<{
          id: string;
          email: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          expires_at: string;
          created_at: string;
        }>(
          `SELECT id, email, status, expires_at, created_at
           FROM family_invite
           WHERE family_id = $1
             AND status = 'pending'
           ORDER BY created_at DESC`,
          [family.family_id],
        )
      : [];

  return jsonSuccess(
    {
      family: family_record,
      role: family.role,
      members,
      invites,
    },
    {
      request_id,
      status: 200,
    },
  );
});
