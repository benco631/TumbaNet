import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HOST_WEIGHT = 3;
const CAR_WEIGHT = 2;

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get members of the active group
  const memberIds = ctx.activeGroupId
    ? (
        await prisma.groupMembership.findMany({
          where: { groupId: ctx.activeGroupId },
          select: { userId: true },
        })
      ).map((m) => m.userId)
    : [];

  const [allUsers, logs] = await Promise.all([
    prisma.user.findMany({
      where: ctx.activeGroupId ? { id: { in: memberIds } } : {},
      select: {
        id: true,
        name: true,
        avatar: true,
        tag: true,
        tumbaCoins: true,
        createdAt: true,
      },
    }),
    prisma.activityLog.findMany({
      where: { groupId: ctx.activeGroupId },
      select: { userId: true, type: true },
    }),
  ]);

  const userStats: Record<string, { hostCount: number; carCount: number }> = {};
  for (const user of allUsers) {
    userStats[user.id] = { hostCount: 0, carCount: 0 };
  }
  for (const log of logs) {
    if (!userStats[log.userId]) continue;
    if (log.type === "HOST") userStats[log.userId].hostCount++;
    if (log.type === "CAR") userStats[log.userId].carCount++;
  }

  const leaderboard = allUsers
    .map((user) => {
      const stats = userStats[user.id] || { hostCount: 0, carCount: 0 };
      return {
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        tag: user.tag,
        tumbaCoins: user.tumbaCoins,
        memberSince: user.createdAt,
        hostCount: stats.hostCount,
        carCount: stats.carCount,
        wearIndex: stats.hostCount * HOST_WEIGHT + stats.carCount * CAR_WEIGHT,
      };
    })
    .sort((a, b) => b.wearIndex - a.wearIndex);

  return NextResponse.json(leaderboard);
}
