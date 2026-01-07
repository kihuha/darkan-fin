import db from "@/utils/db";
import { auth } from "@/utils/auth";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type FamilyContext = {
  userId: string;
  email: string;
  name: string;
  familyId: string;
  role: "admin" | "member";
};

export async function requireUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new ApiError(401, "Unauthorized");
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireFamilyContext(
  headers: Headers
): Promise<FamilyContext> {
  const user = await requireUser(headers);

  const existing = await db.oneOrNone<{
    family_id: string;
    role: "admin" | "member";
  }>(
    `SELECT family_id, role
     FROM family_member
     WHERE user_id = $1`,
    [user.userId]
  );

  if (existing) {
    return {
      ...user,
      familyId: existing.family_id,
      role: existing.role,
    };
  }

  try {
    const created = await db.tx(async (tx) => {
      const family = await tx.one<{ id: string }>(
        `INSERT INTO family (name)
         VALUES (NULL)
         RETURNING id`
      );

      await tx.none(
        `INSERT INTO family_member (family_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [family.id, user.userId]
      );

      await tx.none(
        `INSERT INTO category (family_id, name, type, amount, repeats, description)
         VALUES ($1, 'Uncategorized', 'expense', 0, false, 'Default category for uncategorized items')
         ON CONFLICT (family_id, LOWER(name)) DO NOTHING`,
        [family.id]
      );

      return { familyId: family.id, role: "admin" as const };
    });

    return {
      ...user,
      familyId: created.familyId,
      role: created.role,
    };
  } catch (error) {
    const fallback = await db.oneOrNone<{
      family_id: string;
      role: "admin" | "member";
    }>(
      `SELECT family_id, role
       FROM family_member
       WHERE user_id = $1`,
      [user.userId]
    );

    if (fallback) {
      return {
        ...user,
        familyId: fallback.family_id,
        role: fallback.role,
      };
    }

    throw error;
  }
}

export function assertAdmin(context: FamilyContext) {
  if (context.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }
}
