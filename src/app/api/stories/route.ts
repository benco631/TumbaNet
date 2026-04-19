import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserId = (session.user as { id: string }).id;

  try {
    const usersWithStories = await prisma.user.findMany({
      where: {
        stories: { some: { expiresAt: { gt: new Date() } } }
      },
      select: {
        id: true,
        name: true,
        avatar: true, // <--- חזרנו ל-avatar האהוב והמוכר!
        stories: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "asc" },
          include: {
            views: { where: { userId: currentUserId } }
          }
        }
      }
    });

    const groupedStories = usersWithStories.map(user => {
      const hasUnseen = user.stories.some(story => story.views.length === 0);
      
      return {
        id: user.id,
        user: { id: user.id, name: user.name, avatar: user.avatar }, // <--- גם פה חזרנו ל-avatar
        hasUnseen,
        isMe: user.id === currentUserId,
        items: user.stories.map(s => ({
          id: s.id, url: s.url, type: s.type, createdAt: s.createdAt
        }))
      };
    });

    groupedStories.sort((a, b) => {
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return 0;
    });

    return NextResponse.json(groupedStories);
  } catch (error) {
    console.error("Failed to fetch stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

// ─── 2. יצירת סטורי חדש ───
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { url, type = "image", caption } = await req.json();

  if (!url) return NextResponse.json({ error: "Missing media URL" }, { status: 400 });

  // מגדירים שעת תפוגה: בדיוק בעוד 24 שעות מהרגע הזה
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  try {
    const newStory = await prisma.story.create({
      data: {
        url,
        type,
        caption,
        userId,
        expiresAt
      }
    });

    return NextResponse.json(newStory);
  } catch (error) {
    console.error("Failed to create story:", error);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}

// ─── 3. מחיקת סטורי ───
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("storyId");

  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  try {
    // קודם מוודאים שהסטורי באמת קיים ושייך למשתמש שמנסה למחוק אותו
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    
    if (!story || story.userId !== userId) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 403 });
    }

    // מוחקים מהדאטה-בייס
    await prisma.story.delete({ where: { id: storyId } });
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Failed to delete story:", error);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}