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

  notifyAllUsers({
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
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.userId !== ctx.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ success: true });
}
