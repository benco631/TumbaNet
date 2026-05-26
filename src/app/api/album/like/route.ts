import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { mediaId } = await req.json();

  if (!mediaId) {
    return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
  }

  try {
    // 1. קודם נבדוק אם כבר קיים לייק של המשתמש הזה לתמונה הספציפית
    const existingLike = await prisma.mediaLike.findUnique({
      where: {
        mediaId_userId: { mediaId, userId },
      },
    });

    if (existingLike) {
      // 2א. אם מצאנו לייק - זה אומר שהמשתמש רוצה להוריד אותו (Unlike)
      await prisma.mediaLike.delete({
        where: { id: existingLike.id },
      });
      return NextResponse.json({ liked: false });
    } else {
      // 2ב. אם לא מצאנו - זה לייק חדש! נשמור אותו במסד הנתונים
      await prisma.mediaLike.create({
        data: { mediaId, userId },
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}