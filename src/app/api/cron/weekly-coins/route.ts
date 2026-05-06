import { NextRequest, NextResponse } from "next/server";
import { runWeeklyAllowance } from "@/lib/weekly-allowance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/weekly-coins
 * Triggered by Vercel Cron every Sunday at 07:00 UTC (09:00 Israel time).
 * Protected by CRON_SECRET in Authorization header.
 *
 * vercel.json schedule: "0 7 * * 0"
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/weekly-coins] Starting weekly allowance run...");
    const result = await runWeeklyAllowance();
    console.log(`[cron/weekly-coins] Done. ${result.summary}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/weekly-coins] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
