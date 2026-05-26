import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/groups/leave — Leave a group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 400 });
    }

    // Don't let the last admin leave without transferring
    if (membership.role === "ADMIN") {
      const adminCount = await prisma.groupMembership.count({
        where: { groupId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        const memberCount = await prisma.groupMembership.count({ where: { groupId } });
        if (memberCount > 1) {
          return NextResponse.json(
            { error: "You are the only admin. Transfer admin role before leaving." },
            { status: 400 }
          );
        }
        // If the admin is the only member, delete the group
        await prisma.$transaction(async (tx) => {
          await tx.groupJoinRequest.deleteMany({ where: { groupId } });
          await tx.groupMembership.deleteMany({ where: { groupId } });
          await tx.user.updateMany({
            where: { activeGroupId: groupId },
            data: { activeGroupId: null },
          });
          await tx.group.delete({ where: { id: groupId } });
        });
        return NextResponse.json({ status: "group_deleted" });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.delete({
        where: { userId_groupId: { userId, groupId } },
      });

      // If this was the active group, switch to another or null
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { activeGroupId: true },
      });

      if (user?.activeGroupId === groupId) {
        const nextMembership = await tx.groupMembership.findFirst({
          where: { userId },
          orderBy: { joinedAt: "asc" },
        });
        await tx.user.update({
          where: { id: userId },
          data: { activeGroupId: nextMembership?.groupId || null },
        });
      }
    });

    return NextResponse.json({ status: "left" });
  } catch (err) {
    console.error("Error leaving group:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
