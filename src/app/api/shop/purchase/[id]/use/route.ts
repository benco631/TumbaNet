import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { notifyAllUsers } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, activeGroupId: true }
    });

    if (!user || !user.activeGroupId) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const purchaseId = params.id;

    // שולפים את הרכישה מהדאטה-בייס (שנה את shopPurchase ל-purchase אם ככה קוראים לזה אצלך)
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { shopItem: true }
    });

    if (!purchase || purchase.userId !== user.id) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 400 });
    }
    
    if (purchase.isUsed) {
      return NextResponse.json({ error: "Item already used" }, { status: 400 });
    }

    // 1. מסמנים את הפריט כנוצל
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: { isUsed: true }
    });

    // 2. שולחים פוש מטורף לכל הקבוצה!
    await notifyAllUsers({
      actorId: user.id,
      actorName: user.name,
      groupId: user.activeGroupId,
      type: "SHOP_USE",
      message: `${user.name} just activated: ${purchase.shopItem.title}! 💥`,
      targetUrl: "/shop"
    });

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Use item error:", error);
    return NextResponse.json({ error: "Failed to use item" }, { status: 500 });
  }
}