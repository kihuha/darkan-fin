import { prisma } from "@/lib/prisma";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";

export const GET = withRouteContext(async ({ family, request_id }) => {
  if (!family) {
    throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
  }

  // Mark expired invites
  await prisma.family_invite.updateMany({
    where: {
      family_id: BigInt(family.family_id),
      status: "pending",
      expires_at: {
        lte: new Date(),
      },
    },
    data: {
      status: "expired",
    },
  });

  // Get family record
  const family_record = await prisma.family.findUnique({
    where: {
      id: BigInt(family.family_id),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!family_record) {
    throw new ApiError(404, "NOT_FOUND", "Family not found");
  }

  // Get family members
  const members = await prisma.family_member.findMany({
    where: {
      family_id: BigInt(family.family_id),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  // Format members
  const formatted_members = members.map((m) => ({
    id: m.id.toString(),
    user_id: m.user_id,
    role: m.role as "admin" | "member",
    created_at: m.created_at.toISOString(),
    name: m.user.name,
    email: m.user.email,
  }));

  // Get invites (only for admins)
  let invites: any[] = [];
  if (family.role === "admin") {
    const pending_invites = await prisma.family_invite.findMany({
      where: {
        family_id: BigInt(family.family_id),
        status: "pending",
      },
      select: {
        id: true,
        email: true,
        status: true,
        expires_at: true,
        created_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    invites = pending_invites.map((inv) => ({
      id: inv.id.toString(),
      email: inv.email,
      status: inv.status as "pending" | "accepted" | "revoked" | "expired",
      expires_at: inv.expires_at.toISOString(),
      created_at: inv.created_at.toISOString(),
    }));
  }

  return jsonSuccess(
    {
      family: {
        id: family_record.id.toString(),
        name: family_record.name,
      },
      role: family.role,
      members: formatted_members,
      invites,
    },
    {
      request_id,
      status: 200,
    },
  );
});
