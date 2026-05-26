import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { notifySingleUser } from "@/lib/notifications"; // תחליף לנתיב האמיתי של הקובץ שלך

// פונקציה למשיכת כל הבקשות שממתינות לאישור
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!adminUser?.isAdmin) return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });

    const pendingRequests = await prisma.activityRequest.findMany({
      where: { status: "PENDING", groupId: adminUser.activeGroupId },
      include: {
        user: { select: { name: true, avatar: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(pendingRequests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// פונקציה לאישור או דחייה של בקשה
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!adminUser?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { requestId, action } = await req.json(); // action = "APPROVE" | "REJECT"

    const request = await prisma.activityRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "PENDING") {
      return NextResponse.json({ error: "Request not found or already resolved" }, { status: 400 });
    }

    if (action === "REJECT") {
      await prisma.$transaction(async (tx) => {
        // 1. דוחים את הבקשה
        await tx.activityRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED", resolvedById: adminUser.id }
        });

        // 2. שולחים נוטיפיקציה מבאסת (אבל חשובה) למשתמש
        await tx.notification.create({
          data: {
            recipientId: request.userId,
            actorId: adminUser.id,
            groupId: request.groupId,
            type: "REJECTED",
            message: `Your ${request.type === "DRIVE" ? "drive" : "host"} report was rejected. `
          }
        });
        // שליחת פוש של דחייה
      await notifySingleUser(request.userId, {
        actorId: adminUser.id,
        actorName: adminUser.name,
        type: "REJECTED",
        message: `Your ${request.type === "DRIVE" ? "drive" : "host"} report was rejected. `,
        targetUrl: "/"
      });
      });

      return NextResponse.json({ success: true, message: "Request rejected" });
    }

    if (action === "APPROVE") {
      // כאן קורה כל הקסם בטרנזקציה אחת: מעדכנים סטטוס, מוסיפים מטבעות, יוצרים לוג ונוטיפיקציה!
      await prisma.$transaction(async (tx) => {
        // 1. אישור הבקשה
        await tx.activityRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED", resolvedById: adminUser.id }
        });

        // 2. העברת המטבעות למשתמש
        await tx.user.update({
          where: { id: request.userId },
          data: { tumbaCoins: { increment: request.calculatedCoins } }
        });

        // 3. תיעוד הטרנזקציה לקופה
        await tx.coinTransaction.create({
          data: {
            userId: request.userId,
            groupId: request.groupId,
            amount: request.calculatedCoins,
            reason: `Activity Approved: ${request.type} (${request.subType})`
          }
        });

        // 4. פרסום בפיד הראשי של הקבוצה!
        await tx.activityLog.create({
          data: {
            userId: request.userId,
            groupId: request.groupId,
            // 👇 הנה התיקון! מתרגמים את DRIVE ל-CAR כדי שהפיד יבין 👇
            type: request.type === "DRIVE" ? "CAR" : request.type, 
            note: request.note,
            passengerCount: request.type === "DRIVE" ? request.participantCount : null,
            attendeeCount: request.type === "HOST" ? request.participantCount : null,
            shortNotice: request.subType === "INVESTED"
          }
        });
        // 5. שליחת נוטיפיקציה למשתמש
        await tx.notification.create({
          data: {
            recipientId: request.userId,
            actorId: adminUser.id,
            groupId: request.groupId,
            type: "REWARD",
            message: `Your ${request.type.toLowerCase()} report was approved! You earned ${request.calculatedCoins} TumbaCoins `
          }
        });
      });
      // 5. שליחת פוש נוטיפיקציה למשתמש (מחוץ לטרנזקציה)
      await notifySingleUser(request.userId, {
        actorId: adminUser.id,
        actorName: adminUser.name,
        type: "REWARD",
        message: `Your ${request.type === "DRIVE" ? "drive" : "host"} report was approved! You earned ${request.calculatedCoins} TumbaCoins.`,
        targetUrl: "/"
      });

      return NextResponse.json({ success: true, message: "Request approved and coins awarded!" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error resolving request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}