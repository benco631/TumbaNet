import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Place a wager on a bet option
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { betOptionId, amount } = await req.json();

  if (!betOptionId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid wager" }, { status: 400 });
  }

  // Get the bet option and its parent bet
  const betOption = await prisma.betOption.findUnique({
    where: { id: betOptionId },
    include: { bet: true },
  });

  if (!betOption) {
    return NextResponse.json({ error: "Bet option not found" }, { status: 404 });
  }

  if (betOption.bet.status !== "OPEN") {
    return NextResponse.json({ error: "Bet is not open" }, { status: 400 });
  }

  if (new Date() > new Date(betOption.bet.closingDate)) {
    return NextResponse.json({ error: "Bet has expired" }, { status: 400 });
  }

  // Check if user already wagered on this option
  const existingWager = await prisma.wager.findUnique({
    where: { userId_betOptionId: { userId, betOptionId } },
  });

  if (existingWager) {
    return NextResponse.json({ error: "You already placed a wager on this option" }, { status: 400 });
  }

  // Check if user has enough coins
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tumbaCoins < amount) {
    return NextResponse.json({ error: "Not enough TumbaCoins" }, { status: 400 });
  }

  // Deduct coins and create wager in a transaction
  const [wager] = await prisma.$transaction([
    prisma.wager.create({
      data: { userId, betOptionId, amount },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { tumbaCoins: { decrement: amount } },
    }),
  ]);

  return NextResponse.json(wager);
}
