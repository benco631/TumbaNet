import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

 const events = await prisma.event.findMany({
    where: { groupId: ctx.activeGroupId },
    orderBy: { date: "asc" },
    include: {
      user: { select: { id: true, name: true, avatar: true } }, // שינינו ל-avatar
      rsvps: {
        include: {
          user: { select: { id: true, name: true, avatar: true } }, // שינינו ל-avatar
        },
      },
      polls: {
        include: {
          options: {
            include: {
              votes: {
                include: {
                  user: { select: { id: true, name: true, avatar: true } }, // שינינו ל-avatar
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, date, location, category, polls } = await req.json();

  if (!title || !description || !date) {
    return NextResponse.json({ error: "Title, description, and date are required" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: new Date(date),
      location: location || null,
      category: category || "other",
      userId: ctx.userId,
      groupId: ctx.activeGroupId,
      polls: polls?.length
        ? {
            create: polls.map((poll: { question: string; options: string[] }) => ({
              question: poll.question,
              options: {
                create: poll.options.map((text: string) => ({ text })),
              },
            })),
          }
        : undefined,
    },
    include: {
      user: { select: { id: true, name: true } },
      rsvps: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      polls: {
        include: {
          options: {
            include: {
              votes: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  await notifyAllUsers({
    actorId: ctx.userId,
    actorName: event.user.name,
    type: "EVENT",
    message: `${event.user.name} added a new event: ${event.title}`,
    targetUrl: "/events",
    groupId: ctx.activeGroupId,
  }).catch(() => {});

  return NextResponse.json(event);
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getSessionContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // שליפת המשתמש כדי לוודא אם הוא אדמין
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { isAdmin: true }
    });
    const isAdmin = currentUser?.isAdmin || false;

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // רק יוצר האירוע או אדמין יכולים למחוק
    if (event.userId !== ctx.userId && !isAdmin) {
      return NextResponse.json({ error: "Not authorized to delete this event" }, { status: 403 });
    }

    // בזכות ה- onDelete: Cascade בסכמה שלך, השורה הזו מוחקת את האירוע ואת כל הסקרים והאישורים שקשורים אליו!
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}