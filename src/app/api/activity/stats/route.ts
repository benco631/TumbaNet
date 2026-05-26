import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET aggregated activity stats for the Wear Index + last host/car
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get activity logs scoped to active group
  const logs = await prisma.activityLog.findMany({
    where: { groupId: ctx.activeGroupId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Compute last host and last car
  const lastHost = logs.find((l) => l.type === "HOST") || null;
  const lastCar = logs.find((l) => l.type === "CAR") || null;

  // Get group members (or all users if no group)
  const allUsers = ctx.activeGroupId
    ? await prisma.user.findMany({
        where: {
          groupMemberships: { some: { groupId: ctx.activeGroupId } },
        },
        select: { id: true, name: true, avatar: true },
      })
    : await prisma.user.findMany({
        select: { id: true, name: true, avatar: true },
      });

  const userStats: Record<string, { name: string; avatar: string | null; hostCount: number; carCount: number }> = {};

  for (const user of allUsers) {
    userStats[user.id] = { name: user.name, avatar: user.avatar, hostCount: 0, carCount: 0 };
  }

  for (const log of logs) {
    if (!userStats[log.userId]) continue;
    if (log.type === "HOST") userStats[log.userId].hostCount++;
    if (log.type === "CAR") userStats[log.userId].carCount++;
  }

  const HOST_WEIGHT = 3;
  const CAR_WEIGHT = 2;

  const wearIndex = Object.entries(userStats)
    .map(([id, stats]) => ({
      userId: id,
      name: stats.name,
      avatar: stats.avatar,
      hostCount: stats.hostCount,
      carCount: stats.carCount,
      wearIndex: stats.hostCount * HOST_WEIGHT + stats.carCount * CAR_WEIGHT,
    }))
    .sort((a, b) => b.wearIndex - a.wearIndex);

  return NextResponse.json({
    lastHost: lastHost
      ? { name: lastHost.user.name, avatar: lastHost.user.avatar, date: lastHost.createdAt, note: lastHost.note }
      : null,
    lastCar: lastCar
      ? { name: lastCar.user.name, avatar: lastCar.user.avatar, date: lastCar.createdAt, note: lastCar.note }
      : null,
    wearIndex,
  });
}
