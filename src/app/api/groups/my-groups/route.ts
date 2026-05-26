import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/groups/my-groups — Get all groups the user belongs to
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.groupMembership.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeGroupId: true },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      avatar: m.group.avatar,
      privacy: m.group.privacy,
      inviteCode: m.group.inviteCode,
      memberCount: m.group._count.memberships,
      myRole: m.role,
      isActive: m.group.id === user?.activeGroupId,
      joinedAt: m.joinedAt,
    }));

    // Also fetch pending join requests
    const pendingRequests = await prisma.groupJoinRequest.findMany({
      where: { userId, status: "PENDING" },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ groups, pendingRequests });
  } catch (err) {
    console.error("Error fetching groups:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
