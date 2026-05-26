import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionUserId = (session.user as { id: string }).id;
    const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin;

    const currentUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, name: true, activeGroupId: true }
    });

    if (!currentUser || !currentUser.activeGroupId) {
      return NextResponse.json({ error: "User or Group not found" }, { status: 400 });
    }

    const { betId, winningOptionId } = await req.json();

    if (!betId || !winningOptionId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: { 
        options: { 
          include: { wagers: true } 
        } 
      },
    });

    if (!bet) return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    if (bet.userId !== currentUser.id && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (bet.status === "RESOLVED") return NextResponse.json({ error: "Already resolved" }, { status: 400 });

    const winningOption = bet.options.find((o) => o.id === winningOptionId);
    if (!winningOption) return NextResponse.json({ error: "Invalid winning option" }, { status: 400 });

    const totalPool = bet.options.reduce((sum, opt) => sum + opt.wagers.reduce((s, w) => s + w.amount, 0), 0);
    const winningPool = winningOption.wagers.reduce((s, w) => s + w.amount, 0);

    const payouts: { wagerId: string; userId: string; payout: number }[] = [];
    
    if (winningPool > 0 && totalPool > 0) {
      for (const wager of winningOption.wagers) {
        const payout = Math.round((wager.amount / winningPool) * totalPool);
        payouts.push({ wagerId: wager.id, userId: wager.userId, payout });
      }
    } else if (winningPool === 0) {
      for (const option of bet.options) {
        for (const wager of option.wagers) {
          payouts.push({ wagerId: wager.id, userId: wager.userId, payout: wager.amount });
        }
      }
    }

    // ביצוע העדכון במסד הנתונים
    await prisma.$transaction([
      prisma.bet.update({ where: { id: betId }, data: { status: "RESOLVED", resolvedOptionId: winningOptionId } }),
      ...payouts.flatMap((p) => [
        prisma.wager.update({ where: { id: p.wagerId }, data: { payout: p.payout } }),
        prisma.user.update({ where: { id: p.userId }, data: { tumbaCoins: { increment: p.payout } } }),
      ]),
      ...bet.options.filter((o) => o.id !== winningOptionId).flatMap((o) =>
        o.wagers.map((w) => prisma.wager.update({ where: { id: w.id }, data: { payout: 0 } }))
      ),
    ]);

    // שליחת הודעה כללית לכל הקבוצה - זה יקפיץ לכולם פוש לטלפון
    // וכל אחד יכנס לראות כמה הוא הרוויח/הפסיד
    await notifyAllUsers({
      actorId: currentUser.id,
      actorName: "TumbaMarket",
      groupId: currentUser.activeGroupId,
      type: "BET",
      message: `The bet "${bet.title}" is over! Check the Market to see your results.`,
      targetUrl: "/market",
    });

    return NextResponse.json({ success: true, totalPool, payouts: payouts.length });

  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}