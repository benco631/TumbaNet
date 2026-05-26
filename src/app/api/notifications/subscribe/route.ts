import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // וודא שהנתיב הזה תואם לאיפה ש-authOptions שלך נמצא
import { prisma } from "@/lib/prisma"; // וודא שהנתיב תואם ל-prisma client שלך

export async function POST(req: Request) {
  try {
    // 1. מוודאים שמי שפונה אלינו הוא משתמש מחובר
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string };

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. מקבלים את פרטי המכשיר (Subscription)
    const subscription = await req.json();
    const { endpoint, keys } = subscription;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    // 3. שומרים בדאטה-בייס (משתמשים ב-upsert כדי לא לשכפל אם הוא נרשם פעמיים)
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: user.id,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}