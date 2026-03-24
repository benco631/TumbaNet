import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all albums
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const albums = await prisma.album.findMany({
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const album = await prisma.album.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      userId,
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (album.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.album.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
