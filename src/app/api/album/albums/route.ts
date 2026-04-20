import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all albums
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const albums = await prisma.album.findMany({
    where: { groupId: ctx.activeGroupId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { media: true } },
      media: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { url: true, type: true },
      },
    },
  });

  return NextResponse.json(albums);
}

// Create album
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const album = await prisma.album.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      userId: ctx.userId,
      groupId: ctx.activeGroupId,
    },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { media: true } },
    },
  });

  return NextResponse.json(album);
}

// Delete album
export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (album.userId !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.album.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
