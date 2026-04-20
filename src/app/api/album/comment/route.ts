import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// הבאת כל התגובות לפוסט מסוים
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("mediaId");

  if (!mediaId) return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });

  try {
    const comments = await prisma.mediaComment.findMany({
      where: { mediaId },
      orderBy: { createdAt: "asc" }, // הישנות למעלה, החדשות למטה
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// יצירת תגובה חדשה
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { mediaId, content } = await req.json();

  if (!mediaId || !content?.trim()) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const newComment = await prisma.mediaComment.create({
      data: { mediaId, userId, content: content.trim() },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
    return NextResponse.json(newComment);
  } catch {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}