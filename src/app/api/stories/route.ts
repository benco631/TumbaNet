import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const usersWithStories = await prisma.user.findMany({
      where: {
        stories: {
          some: {
            expiresAt: { gt: new Date() },
            groupId: ctx.activeGroupId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        stories: {
          where: {
            expiresAt: { gt: new Date() },
            groupId: ctx.activeGroupId,
          },
          orderBy: { createdAt: "asc" },
          include: {
            views: { where: { userId: ctx.userId } },
          },
        },
      },
    });

    const groupedStories = usersWithStories.map((user) => {
      const hasUnseen = user.stories.some((story) => story.views.length === 0);

      return {
        id: user.id,
        user: { id: user.id, name: user.name, avatar: user.avatar },
        hasUnseen,
        isMe: user.id === ctx.userId,
        items: user.stories.map((s) => ({
          id: s.id,
          url: s.url,
          type: s.type,
          createdAt: s.createdAt,
        })),
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { url, type, caption } = body;

    if (!url || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. שולפים את המשתמש כדי לדעת באיזו קבוצה הוא נמצא כרגע
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeGroupId: true } // או השם המדויק של שדה הקבוצה אצלך
    });

    // 2. יוצרים את הסטורי עם ה-groupId הנכון
    const newStory = await prisma.story.create({
      data: {
        url,
        type,
        caption,
        userId: userId,
        groupId: user?.activeGroupId || null, // מחברים את הסטורי לקבוצה!
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json(newStory, { status: 201 });
  } catch (error) {
    console.error("Failed to create story:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("storyId");

  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  try {
    const story = await prisma.story.findUnique({ where: { id: storyId } });

    if (!story || story.userId !== ctx.userId) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 403 });
    }

    await prisma.story.delete({ where: { id: storyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete story:", error);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}
