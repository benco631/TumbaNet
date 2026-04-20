import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET activity logs - supports ?type=HOST or ?type=CAR, or all
export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { groupId: ctx.activeGroupId };
  if (type) where.type = type.toUpperCase();

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

// POST create a new activity log (group admin only)
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check group admin
  if (!ctx.activeGroupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: ctx.userId, groupId: ctx.activeGroupId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    userId,
    type,
    note,
    passengerCount,
    distanceKm,
    attendeeCount,
    shortNotice,
  } = await req.json();

  if (!userId || !type) {
    return NextResponse.json({ error: "Missing userId or type" }, { status: 400 });
  }

  const validTypes = ["HOST", "CAR"];
  const typeUpper = type.toUpperCase();
  if (!validTypes.includes(typeUpper)) {
    return NextResponse.json({ error: "Invalid type. Use HOST or CAR" }, { status: 400 });
  }

  const log = await prisma.activityLog.create({
    data: {
      userId,
      type: typeUpper,
      note: note?.trim() || null,
      groupId: ctx.activeGroupId,
      passengerCount: typeUpper === "CAR" && passengerCount != null ? parseInt(passengerCount) || null : null,
      distanceKm:     typeUpper === "CAR" && distanceKm     != null ? parseFloat(distanceKm)  || null : null,
      attendeeCount: typeUpper === "HOST" && attendeeCount != null ? parseInt(attendeeCount) || null : null,
      shortNotice:   typeUpper === "HOST" ? Boolean(shortNotice) : false,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(log, { status: 201 });
}

// DELETE an activity log (group admin only)
export async function DELETE(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ctx.activeGroupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: ctx.userId, groupId: ctx.activeGroupId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.activityLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
