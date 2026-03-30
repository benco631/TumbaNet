import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Set RSVP status for an event
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { eventId, status } = await req.json();

  if (!eventId || !["GOING", "MAYBE", "NOT_GOING"].includes(status)) {
    return NextResponse.json({ error: "Invalid eventId or status" }, { status: 400 });
  }

  const rsvp = await prisma.eventRsvp.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: { status },
    create: { userId, eventId, status },
  });

  return NextResponse.json(rsvp);
}

// Remove RSVP
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { eventId } = await req.json();

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  try {
    await prisma.eventRsvp.delete({
      where: { userId_eventId: { userId, eventId } },
    });
  } catch {
    // No existing RSVP, that's fine
  }

  return NextResponse.json({ success: true });
}
