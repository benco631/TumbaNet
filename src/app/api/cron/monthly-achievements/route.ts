import { NextRequest, NextResponse } from "next/server";
import { runMonthlyAchievements } from "@/lib/achievements";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/monthly-achievements
 * Triggered by Vercel Cron on the 1st of every month at 07:00 UTC (09:00 Israel time).
 * Calculates achievements for the PREVIOUS month across all groups.
 * Protected by CRON_SECRET in Authorization header.
 *
 * vercel.json schedule: "0 7 1 * *"
 *
 * Can also be called manually with query params ?month=M&year=Y to override.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine which month to process: default = previous calendar month
  const { searchParams } = new URL(req.url);
  let month: number;
  let year: number;

  const qMonth = searchParams.get("month");
  const qYear = searchParams.get("year");

  if (qMonth && qYear) {
    month = parseInt(qMonth);
    year = parseInt(qYear);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2020) {
      return NextResponse.json({ error: "Invalid month or year params" }, { status: 400 });
    }
  } else {
    const now = new Date();
    // Previous month
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    month = prev.getMonth() + 1;
    year = prev.getFullYear();
  }

  try {
    console.log(`[cron/monthly-achievements] Starting for ${month}/${year}...`);
    const result = await runMonthlyAchievements(month, year);
    console.log(`[cron/monthly-achievements] Done. ${result.summary}`);
    return NextResponse.json({ ok: true, month, year, ...result });
  } catch (err) {
    console.error("[cron/monthly-achievements] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
