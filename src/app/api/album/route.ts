import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all media, optionally filtered by albumId, userId, month
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (albumId) where.albumId = albumId;
  if (userId) where.userId = userId;

  const media = await prisma.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      album: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(media);
}

// Upload media (URL-based)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { url, caption, type, albumId } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const media = await prisma.media.create({
    data: {
      url: url.trim(),
      caption: caption?.trim() || null,
      type: type || "image",
      userId,
      albumId: albumId || null,
    },
    include: {
      user: { select: { id: true, name: true } },
      album: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(media);
}

// Delete media
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

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (media.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
