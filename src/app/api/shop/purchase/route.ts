import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST purchase an item
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { shopItemId } = await req.json();

  if (!shopItemId) {
    return NextResponse.json({ error: "Missing shopItemId" }, { status: 400 });
  }

  // Fetch item and user in parallel
  const [item, user] = await Promise.all([
    prisma.shopItem.findUnique({ where: { id: shopItemId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!item || !item.active) {
    return NextResponse.json({ error: "Item not found or inactive" }, { status: 404 });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.tumbaCoins < item.price) {
    return NextResponse.json(
      { error: "Not enough TumbaCoins", required: item.price, balance: user.tumbaCoins },
      { status: 400 }
    );
  }

  // Atomic transaction: deduct coins + create purchase record
  const [purchase] = await prisma.$transaction([
    prisma.purchase.create({
      data: {
        userId,
        shopItemId: item.id,
        price: item.price,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { tumbaCoins: { decrement: item.price } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    purchase,
    newBalance: user.tumbaCoins - item.price,
  });
}

// GET purchase history for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;

  const purchases = await prisma.purchase.findMany({
    where: isAdmin ? {} : { userId },
    include: {
      shopItem: { select: { title: true, imageUrl: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(purchases);
}
