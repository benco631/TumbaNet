import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Resolve a bet - creator or admin picks the winning option
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  const { betId, winningOptionId } = await req.json();

  if (!betId || !winningOptionId) {
    return NextResponse.json({ error: "Missing betId or winningOptionId" }, { status: 400 });
  }

  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    include: {
      options: {
        include: {
          wagers: true,
        },
      },
    },
  });

  if (!bet) {
    return NextResponse.json({ error: "Bet not found" }, { status: 404 });
  }

  if (bet.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Only the creator or admin can resolve" }, { status: 403 });
  }

  if (bet.status === "RESOLVED") {
    return NextResponse.json({ error: "Already resolved" }, { status: 400 });
  }

  const winningOption = bet.options.find((o) => o.id === winningOptionId);
  if (!winningOption) {
    return NextResponse.json({ error: "Invalid winning option" }, { status: 400 });
  }

  // Calculate total pool and winning pool
  const totalPool = bet.options.reduce(
    (sum, opt) => sum + opt.wagers.reduce((s, w) => s + w.amount, 0),
    0
  );

  const winningPool = winningOption.wagers.reduce((s, w) => s + w.amount, 0);

  // Distribute winnings proportionally
  const payouts: { wagerId: string; userId: string; payout: number }[] = [];

  if (winningPool > 0 && totalPool > 0) {
    for (const wager of winningOption.wagers) {
      const payout = Math.round((wager.amount / winningPool) * totalPool);
      payouts.push({ wagerId: wager.id, userId: wager.userId, payout });
    }
  } else if (winningPool === 0) {
    // No one bet on the winning option - refund everyone
    for (const option of bet.options) {
      for (const wager of option.wagers) {
        payouts.push({ wagerId: wager.id, userId: wager.userId, payout: wager.amount });
      }
    }
  }

  // Execute payouts in a transaction
  await prisma.$transaction([
    // Update bet status
    prisma.bet.update({
      where: { id: betId },
      data: { status: "RESOLVED", resolvedOptionId: winningOptionId },
    }),
    // Update each wager with payout and credit user
    ...payouts.flatMap((p) => [
      prisma.wager.update({
        where: { id: p.wagerId },
        data: { payout: p.payout },
      }),
      prisma.user.update({
        where: { id: p.userId },
        data: { tumbaCoins: { increment: p.payout } },
      }),
    ]),
    // Mark losing wagers with 0 payout
    ...bet.options
      .filter((o) => o.id !== winningOptionId)
      .flatMap((o) =>
        o.wagers.map((w) =>
          prisma.wager.update({
            where: { id: w.id },
            data: { payout: 0 },
          })
        )
      ),
  ]);

  return NextResponse.json({ success: true, totalPool, payouts: payouts.length });
}
