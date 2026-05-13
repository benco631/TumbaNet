import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
// מחקנו את ה-import של notifyAllUsers כדי למנוע ספאם לכל הקבוצה
import { authOptions } from "@/lib/auth"; // שים לב שזה אכן הנתיב הנכון בפרויקט שלך

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. דיבאג ברמת השרת כדי שנראה בדיוק אם חסר סשן
    if (!session || !session.user) {
      console.log("Debug [Transfer]: No session found");
      return NextResponse.json({ error: "Unauthorized - Please log in again" }, { status: 401 });
    }

    let senderId = (session.user as { id?: string })?.id;

    // 2. חגורת בטיחות: אם NextAuth שומר רק אימייל (ולא ID), נשלוף את ה-ID מה-DB
    if (!senderId && session.user.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      senderId = dbUser?.id;
    }

    if (!senderId) {
      console.log("Debug [Transfer]: Session exists but could not determine User ID", session);
      return NextResponse.json({ error: "Unauthorized - User ID missing" }, { status: 401 });
    }

    // 3. קריאת הנתונים מהבקשה
    const { recipientId, amount } = await req.json();

    if (!recipientId || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid transfer details" }, { status: 400 });
    }

    if (senderId === recipientId) {
      return NextResponse.json({ error: "You cannot send coins to yourself" }, { status: 400 });
    }

    // 4. העברת הכספים ויצירת התראה ממוקדת
    await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({
        where: { id: senderId },
        select: { tumbaCoins: true, name: true },
      });

      if (!sender) throw new Error("Sender not found");
      if (sender.tumbaCoins < amount) throw new Error("Insufficient TumbaCoins balance");

      // הורדת מטבעות מהשולח
      await tx.user.update({
        where: { id: senderId },
        data: { tumbaCoins: { decrement: amount } },
      });

      // הוספת מטבעות למקבל
      await tx.user.update({
        where: { id: recipientId },
        data: { tumbaCoins: { increment: amount } },
      });
      
      // יצירת התראה (In-App) למקבל הספציפי
      await tx.notification.create({
        data: {
          recipientId: recipientId,
          actorId: senderId,
          type: "TRANSFER",
          message: `Sent you ${amount} TumbaCoins!`,
          targetUrl: "/",
        }
      });
    });

    return NextResponse.json({ success: true, message: "Transfer completed" }, { status: 200 });

  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during transfer" },
      { status: 500 }
    );
  }
}