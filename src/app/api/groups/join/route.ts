import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/groups/join — Join a group via invite code
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode, message } = await req.json();

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.trim() },
    });

    if (!group) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    if (existingMembership) {
      // Already a member — just switch to this group
      await prisma.user.update({
        where: { id: userId },
        data: { activeGroupId: group.id },
      });
      return NextResponse.json({ status: "already_member", group });
    }

    // Check if there's a pending join request already
    const existingRequest = await prisma.groupJoinRequest.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    if (existingRequest && existingRequest.status === "PENDING") {
      return NextResponse.json({ status: "pending", group });
    }

    if (group.privacy === "OPEN") {
      // Join directly
      await prisma.$transaction(async (tx) => {
        await tx.groupMembership.create({
          data: { userId, groupId: group.id, role: "MEMBER" },
        });
        await tx.user.update({
          where: { id: userId },
          data: { activeGroupId: group.id },
        });
      });
      return NextResponse.json({ status: "joined", group });
    } else {
      // CLOSED group — create a join request
      await prisma.groupJoinRequest.upsert({
        where: { userId_groupId: { userId, groupId: group.id } },
        create: {
          userId,
          groupId: group.id,
          status: "PENDING",
          message: message?.trim() || null,
        },
        update: {
          status: "PENDING",
          message: message?.trim() || null,
        },
      });

      // Notify the group admin(s)
      const admins = await prisma.groupMembership.findMany({
        where: { groupId: group.id, role: "ADMIN" },
        select: { userId: true },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            recipientId: admin.userId,
            actorId: userId,
            type: "GROUP_JOIN_REQUEST",
            message: `${user?.name || "Someone"} wants to join ${group.name}`,
            targetUrl: `/groups/${group.id}/settings`,
            groupId: group.id,
          },
        });
      }

      return NextResponse.json({ status: "requested", group });
    }
  } catch (err) {
    console.error("Error joining group:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
