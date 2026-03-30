import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET all bets
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bets = await prisma.bet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      options: {
        include: {
          wagers: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(bets);
}

// CREATE a new bet
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { title, description, closingDate, options } = await req.json();

  if (!title?.trim() || !description?.trim() || !closingDate || !options?.length || options.length < 2) {
    return NextResponse.json({ error: "Missing required fields (title, description, closingDate, at least 2 options)" }, { status: 400 });
  }

  const bet = await prisma.bet.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      closingDate: new Date(closingDate),
      userId,
      options: {
        create: options.map((text: string) => ({ text: text.trim() })),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      options: { include: { wagers: true } },
    },
  });

  // Fire-and-forget notification
  notifyAllUsers({
    actorId: userId,
    actorName: bet.user.name,
    type: "BET",
    message: `${bet.user.name} created a new bet: ${bet.title}`,
    targetUrl: "/market",
  }).catch(() => {});

  return NextResponse.json(bet);
}

// DELETE a bet (creator or admin only)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing bet id" }, { status: 400 });
  }

  const bet = await prisma.bet.findUnique({ where: { id } });
  if (!bet) {
    return NextResponse.json({ error: "Bet not found" }, { status: 404 });
  }

  if (bet.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Refund all wagers before deleting
  const wagers = await prisma.wager.findMany({
    where: { betOption: { betId: id } },
  });

  for (const wager of wagers) {
    await prisma.user.update({
      where: { id: wager.userId },
      data: { tumbaCoins: { increment: wager.amount } },
    });
  }

  await prisma.bet.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
