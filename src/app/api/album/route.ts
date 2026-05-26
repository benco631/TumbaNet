import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all media, optionally filtered by albumId
export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");

  try {
    const media = await prisma.media.findMany({
      where: {
        groupId: ctx.activeGroupId,
        ...(albumId ? { albumId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        album: {
          select: { id: true, name: true },
        },
        likes: {
          select: { userId: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("Failed to fetch media:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

// Upload media (URL-based)
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, caption, type, albumId } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const media = await prisma.media.create({
    data: {
      url: url.trim(),
      caption: caption?.trim() || null,
      type: type || "image",
      userId: ctx.userId,
      groupId: ctx.activeGroupId,
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
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (media.userId !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
