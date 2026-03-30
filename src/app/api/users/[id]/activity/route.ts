import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  detail: string | null;
  createdAt: Date;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = params.id;

  const [actLogs, entries, events, media, bets, wagers, purchases, dictEntries] =
    await Promise.all([
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.entry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, month: true, year: true, createdAt: true },
      }),
      prisma.event.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.media.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, caption: true, createdAt: true },
      }),
      prisma.bet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.wager.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          betOption: {
            select: {
              text: true,
              bet: { select: { title: true } },
            },
          },
        },
      }),
      prisma.purchase.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          price: true,
          createdAt: true,
          shopItem: { select: { title: true } },
        },
      }),
      prisma.dictionaryEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, term: true, createdAt: true },
      }),
    ]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const items: ActivityItem[] = [
    ...actLogs.map((l) => ({
      id: l.id,
      type: l.type === "HOST" ? "host" : "car",
      description: l.type === "HOST" ? "Hosted the group" : "Drove the group",
      detail: l.note || null,
      createdAt: l.createdAt,
    })),
    ...entries.map((e) => ({
      id: e.id,
      type: "highlight",
      description: "Added a highlight",
      detail: e.title || `${MONTHS[e.month - 1]} ${e.year}`,
      createdAt: e.createdAt,
    })),
    ...events.map((e) => ({
      id: e.id,
      type: "event",
      description: "Created an event",
      detail: e.title,
      createdAt: e.createdAt,
    })),
    ...media.map((m) => ({
      id: m.id,
      type: "media",
      description: `Uploaded ${m.type}`,
      detail: m.caption || null,
      createdAt: m.createdAt,
    })),
    ...bets.map((b) => ({
      id: b.id,
      type: "bet",
      description: "Created a bet",
      detail: b.title,
      createdAt: b.createdAt,
    })),
    ...wagers.map((w) => ({
      id: w.id,
      type: "wager",
      description: `Wagered ${w.amount} TC`,
      detail: `"${w.betOption.text}" · ${w.betOption.bet.title}`,
      createdAt: w.createdAt,
    })),
    ...purchases.map((p) => ({
      id: p.id,
      type: "purchase",
      description: `Purchased for ${p.price} TC`,
      detail: p.shopItem.title,
      createdAt: p.createdAt,
    })),
    ...dictEntries.map((d) => ({
      id: d.id,
      type: "dictionary",
      description: "Added to the dictionary",
      detail: d.term,
      createdAt: d.createdAt,
    })),
  ];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(items.slice(0, 30));
}
