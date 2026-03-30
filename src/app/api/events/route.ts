import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
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
      userId,
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
    actorId: userId,
    actorName: event.user.name,
    type: "EVENT",
    message: `${event.user.name} added a new event: ${event.title}`,
    targetUrl: "/events",
  }).catch(() => {});

  return NextResponse.json(event);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ success: true });
}
