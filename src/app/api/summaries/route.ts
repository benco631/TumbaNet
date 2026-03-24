import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function autoCommitPastMonths() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const uncommitted = await prisma.monthlySummary.findMany({
    where: { committed: false },
  });

  for (const summary of uncommitted) {
    const isPast =
      summary.year < currentYear ||
      (summary.year === currentYear && summary.month < currentMonth);

    if (isPast) {
      await prisma.monthlySummary.update({
        where: { id: summary.id },
        data: { committed: true },
      });
    }
  }

  const allMonthsWithEntries = await prisma.entry.groupBy({
    by: ["month", "year"],
  });

  for (const { month, year } of allMonthsWithEntries) {
    const isPast =
      year < currentYear ||
      (year === currentYear && month < currentMonth);

    if (!isPast) continue;

    const existing = await prisma.monthlySummary.findUnique({
      where: { month_year: { month, year } },
    });

    if (!existing) {
      const entries = await prisma.entry.findMany({
        where: { month, year },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });

      if (entries.length > 0) {
        const summaryText = entries
          .map((e) => `${e.user.name}: ${e.content}`)
          .join("\n");

        await prisma.monthlySummary.create({
          data: { month, year, summary: summaryText, committed: true },
        });
      }
    }
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await autoCommitPastMonths();

  const summaries = await prisma.monthlySummary.findMany({
    where: { committed: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(summaries);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only admins can manually commit" },
      { status: 403 }
    );
  }

  const { month, year } = await req.json();

  const entries = await prisma.entry.findMany({
    where: { month, year },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No entries to summarize" },
      { status: 400 }
    );
  }

  const summaryText = entries
    .map((e) => `${e.user.name}: ${e.content}`)
    .join("\n");

  const summary = await prisma.monthlySummary.upsert({
    where: { month_year: { month, year } },
    update: { summary: summaryText, committed: true },
    create: { month, year, summary: summaryText, committed: true },
  });

  return NextResponse.json(summary);
}
