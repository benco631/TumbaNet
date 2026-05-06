import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[id]/coins
 * Returns the user's TumbaCoins balance, recent coin transactions,
 * and latest monthly achievements.
 *
 * Query params:
 *   groupId  — filter transactions/achievements to a specific group (optional)
 *   limit    — number of transactions to return (default 20, max 100)
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetUserId = params.id;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { tumbaCoins: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [transactions, achievements] = await Promise.all([
    prisma.coinTransaction.findMany({
      where: {
        userId: targetUserId,
        ...(groupId ? { groupId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, amount: true, reason: true, groupId: true, createdAt: true },
    }),
    prisma.monthlyAchievement.findMany({
      where: {
        userId: targetUserId,
        ...(groupId ? { groupId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        achievementKey: true,
        month: true,
        year: true,
        groupId: true,
        rewardCoins: true,
        metricLabel: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    tumbaCoins: user.tumbaCoins,
    transactions,
    achievements,
  });
}
