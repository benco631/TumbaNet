import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { notifySingleUser, configureWebPush } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    
    // מוודאים שהמשתמש מחובר
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // שולפים את המשתמש, הקבוצה שלו, **וגם את השם שלו** (בשביל הפוש לאדמין)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, activeGroupId: true }
    });

    if (!user || !user.activeGroupId) {
      return NextResponse.json({ error: "User or active group not found" }, { status: 400 });
    }

    // קולטים את הנתונים שהגיעו מהטופס
    const { type, subType, participantCount, note } = await req.json();

    // חישוב המטבעות המדויק לפי המחירון החדש של ה-Tumbas
    let calculatedCoins = 0;
    const participants = Number(participantCount) || 0;

    if (type === "DRIVE") {
      const basePoints = subType === "SHORT" ? 5 : subType === "MEDIUM" ? 10 : 15;
      calculatedCoins = basePoints + (participants * 1); 
    } else if (type === "HOST") {
      const basePoints = subType === "REGULAR" ? 10 : 20; 
      calculatedCoins = basePoints + (participants * 2); 
    } else {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    // שמירת הבקשה במסד הנתונים כ"ממתינה לאישור"
    const newRequest = await prisma.activityRequest.create({
      data: {
        userId: user.id,
        groupId: user.activeGroupId,
        type,
        subType,
        participantCount: participants,
        note,
        calculatedCoins,
        status: "PENDING", 
      },
    });

    // --- הזרקת פוש נוטיפיקציה למכשירי האדמינים ---
    const admins = await prisma.user.findMany({
      where: { isAdmin: true, activeGroupId: user.activeGroupId },
      select: { id: true }
    });

    if (admins.length > 0) {
      configureWebPush();
      const pushPromises = admins.map(admin => 
        notifySingleUser(admin.id, {
          actorId: user.id,
          actorName: user.name, // עכשיו יש לנו את השם של המדווח
          type: "NEW_REQUEST",
          message: `${user.name} reported a ${type === "DRIVE" ? "drive" : "host"} and is waiting for your approval.`,
          targetUrl: "/admin"
        })
      );
      await Promise.all(pushPromises); // יורים את כל הפושים במקביל
    }

    return NextResponse.json({ success: true, request: newRequest });
    
  } catch (error) {
    console.error("Activity Request Error:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}