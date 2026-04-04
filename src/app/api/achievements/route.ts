import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_DEFS, getAchievementDef } from "@/lib/achievements";

export const dynamic = "force-dynamic";

/**
 * GET /api/achievements?month=4&year=2026
 * Returns the processed achievements for the given month/year.
 * Also returns the full list of achievement definitions so the UI
 * can show "no winner" cards for unawarded achievements.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
  }

  const records = await prisma.monthlyAchievement.findMany({
    where: { month, year },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Group multiple winners per achievement
  const grouped: Record<
    string,
    {
      achievementKey: string;
      winners: { userId: string; userName: string; rewardCoins: number; metricValue: number | null; metricLabel: string | null }[];
    }
  > = {};

  for (const r of records) {
    if (!grouped[r.achievementKey]) {
      grouped[r.achievementKey] = { achievementKey: r.achievementKey, winners: [] };
    }
    grouped[r.achievementKey].winners.push({
      userId: r.userId,
      userName: r.user.name,
      rewardCoins: r.rewardCoins,
      metricValue: r.metricValue,
      metricLabel: r.metricLabel,
    });
  }

  // Merge with definitions so the UI gets a complete list
  const achievements = ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    winners: grouped[def.key]?.winners ?? [],
    processed: Boolean(grouped[def.key]),
  }));

  return NextResponse.json({ month, year, achievements });
}

/**
 * GET /api/achievements/history?userId=xxx
 * Returns a user's achievement history across all months.
 */
export async function HEAD(req: NextRequest) {
  // Not used — placeholder to keep route file valid
  return new NextResponse(null, { status: 200 });
}
