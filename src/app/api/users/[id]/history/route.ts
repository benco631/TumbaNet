import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = params.id;

  const [purchases, actLogs, rsvps, dictEntries] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        price: true,
        createdAt: true,
        shopItem: {
          select: { title: true, category: true, imageUrl: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, note: true, createdAt: true },
    }),
    prisma.eventRsvp.findMany({
      where: { userId },
      orderBy: { event: { date: "desc" } },
      select: {
        id: true,
        status: true,
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            category: true,
          },
        },
      },
    }),
    prisma.dictionaryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, term: true, definition: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    purchases,
    activityLogs: actLogs,
    eventParticipation: rsvps,
    dictionaryContributions: dictEntries,
  });
}
