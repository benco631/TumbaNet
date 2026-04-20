import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/groups/requests — Get pending join requests for a group (admin only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verify admin
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId, status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("Error fetching join requests:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// POST /api/groups/requests — Approve or reject a join request (admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "requestId and action (approve/reject) are required" }, { status: 400 });
    }

    const joinRequest = await prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
      include: { group: true },
    });

    if (!joinRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify admin
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId: joinRequest.groupId } },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (action === "approve") {
      await prisma.$transaction(async (tx) => {
        await tx.groupJoinRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        });

        await tx.groupMembership.create({
          data: {
            userId: joinRequest.userId,
            groupId: joinRequest.groupId,
            role: "MEMBER",
          },
        });

        // Set as active group for the new member if they don't have one
        const user = await tx.user.findUnique({
          where: { id: joinRequest.userId },
          select: { activeGroupId: true },
        });
        if (!user?.activeGroupId) {
          await tx.user.update({
            where: { id: joinRequest.userId },
            data: { activeGroupId: joinRequest.groupId },
          });
        }

        // Notify the requester
        await tx.notification.create({
          data: {
            recipientId: joinRequest.userId,
            actorId: userId,
            type: "GROUP_JOIN_APPROVED",
            message: `You've been approved to join ${joinRequest.group.name}!`,
            targetUrl: "/",
            groupId: joinRequest.groupId,
          },
        });
      });

      return NextResponse.json({ status: "approved" });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.groupJoinRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        });

        await tx.notification.create({
          data: {
            recipientId: joinRequest.userId,
            actorId: userId,
            type: "GROUP_JOIN_REJECTED",
            message: `Your request to join ${joinRequest.group.name} was declined.`,
            targetUrl: "/groups",
            groupId: joinRequest.groupId,
          },
        });
      });

      return NextResponse.json({ status: "rejected" });
    }
  } catch (err) {
    console.error("Error processing join request:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
