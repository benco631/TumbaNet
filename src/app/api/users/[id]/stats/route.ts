import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = params.id;

  const [user, actLogs, purchaseAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        tumbaCoins: true,
        _count: {
          select: {
            entries: true,
            dictionaryEntries: true,
            events: true,
            betsCreated: true,
            wagers: true,
            media: true,
            purchases: true,
            eventRsvps: true,
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId },
      select: { type: true },
    }),
    prisma.purchase.aggregate({
      where: { userId },
      _sum: { price: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hostCount = actLogs.filter((l) => l.type === "HOST").length;
  const carCount = actLogs.filter((l) => l.type === "CAR").length;
  const wearIndex = hostCount * 3 + carCount * 2;
  const totalSpent = purchaseAgg._sum.price ?? 0;

  return NextResponse.json({
    tumbaCoins: user.tumbaCoins,
    hostCount,
    carCount,
    wearIndex,
    entriesCount: user._count.entries,
    dictionaryCount: user._count.dictionaryEntries,
    eventsCreated: user._count.events,
    eventsRsvp: user._count.eventRsvps,
    betsCount: user._count.betsCreated,
    wagersCount: user._count.wagers,
    mediaCount: user._count.media,
    purchasesCount: user._count.purchases,
    totalSpent,
  });
}
