import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET aggregated activity stats for the Wear Index + last host/car
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all activity logs
  const logs = await prisma.activityLog.findMany({
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Compute last host and last car
  const lastHost = logs.find((l) => l.type === "HOST") || null;
  const lastCar = logs.find((l) => l.type === "CAR") || null;

  // Compute per-user stats
  const userStats: Record<string, { name: string; avatar: string | null; hostCount: number; carCount: number }> = {};

  // Get all users to include those with 0 activity
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, avatar: true },
  });

  for (const user of allUsers) {
    userStats[user.id] = { name: user.name, avatar: user.avatar, hostCount: 0, carCount: 0 };
  }

  for (const log of logs) {
    if (!userStats[log.userId]) {
      userStats[log.userId] = { name: log.user.name, avatar: log.user.avatar, hostCount: 0, carCount: 0 };
    }
    if (log.type === "HOST") userStats[log.userId].hostCount++;
    if (log.type === "CAR") userStats[log.userId].carCount++;
  }

  /**
   * Wear Index Formula:
   * wearIndex = (hostCount * 3) + (carCount * 2)
   *
   * Hosting is weighted more heavily (3x) because it requires more effort
   * (cleaning, preparing space, etc.) compared to providing a car ride (2x).
   */
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
