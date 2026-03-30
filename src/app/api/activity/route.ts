import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET activity logs - supports ?type=HOST or ?type=CAR, or all
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where = type ? { type: type.toUpperCase() } : {};

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

// POST create a new activity log (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, type, note } = await req.json();

  if (!userId || !type) {
    return NextResponse.json({ error: "Missing userId or type" }, { status: 400 });
  }

  const validTypes = ["HOST", "CAR"];
  if (!validTypes.includes(type.toUpperCase())) {
    return NextResponse.json({ error: "Invalid type. Use HOST or CAR" }, { status: 400 });
  }

  const log = await prisma.activityLog.create({
    data: {
      userId,
      type: type.toUpperCase(),
      note: note?.trim() || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(log, { status: 201 });
}

// DELETE an activity log (admin only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
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
