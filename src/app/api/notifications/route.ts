import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — fetch current user's notifications for the active group
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: ctx.userId,
      OR: [
        { groupId: ctx.activeGroupId },
        { groupId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { id: true, name: true } },
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      recipientId: ctx.userId,
      isRead: false,
      OR: [
        { groupId: ctx.activeGroupId },
        { groupId: null },
      ],
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH — mark notifications as read
export async function PATCH(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, all } = await req.json();

  if (all) {
    await prisma.notification.updateMany({
      where: {
        recipientId: ctx.userId,
        isRead: false,
        OR: [
          { groupId: ctx.activeGroupId },
          { groupId: null },
        ],
      },
      data: { isRead: true },
    });
  } else if (id) {
    await prisma.notification.updateMany({
      where: { id, recipientId: ctx.userId },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
