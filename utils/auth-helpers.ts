import "server-only";

import db from "@/utils/db";
import { auth } from "@/utils/auth";
import { ApiError } from "@/utils/errors";
import type { FamilyRole } from "@/types/domain";

export type SessionContext = {
  user_id: string;
  email: string;
  name: string;
};

export type FamilyContext = SessionContext & {
  family_id: string;
  role: FamilyRole;
};

export async function getSessionOrThrow(headers: Headers): Promise<SessionContext> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication required");
  }

  return {
    user_id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function getFamilyContextOrThrow(
  headers: Headers,
): Promise<FamilyContext> {
  const user = await getSessionOrThrow(headers);

  const membership = await db.oneOrNone<{
    family_id: string;
    role: FamilyRole;
  }>(
    `SELECT family_id, role
     FROM family_member
     WHERE user_id = $1`,
    [user.user_id],
  );

  if (!membership) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You are authenticated but not assigned to a family",
    );
  }

  return {
    ...user,
    family_id: membership.family_id,
    role: membership.role,
  };
}

export function assertAdmin(context: FamilyContext): void {
  if (context.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Admin access required");
  }
}

// Backwards-compatible aliases while callers migrate.
export const requireUser = getSessionOrThrow;
export const requireFamilyContext = getFamilyContextOrThrow;
