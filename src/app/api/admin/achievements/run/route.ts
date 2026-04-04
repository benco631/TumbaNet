import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runMonthlyAchievements } from "@/lib/achievements";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/achievements/run
 * Admin-only: calculate and award monthly achievements for a given month/year.
 * Safe to run multiple times — duplicate awards are skipped.
 *
 * Body: { month: number (1-12), year: number }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let month: number, year: number;
  try {
    const body = await req.json();
    month = parseInt(body.month);
    year = parseInt(body.year);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2020) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await runMonthlyAchievements(month, year);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[admin/achievements/run]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
