import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where = {
    groupId: ctx.activeGroupId,
    ...(search
      ? {
          OR: [
            { term: { contains: search } },
            { definition: { contains: search } },
          ],
        }
      : {}),
  };

  const entries = await prisma.dictionaryEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      ratings: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const entriesWithUserRating = entries.map((entry) => {
    const totalRating = entry.ratings.reduce((sum, r) => sum + r.value, 0);
    const userRating = entry.ratings.find((r) => r.userId === ctx.userId);
    return {
      ...entry,
      ratings: undefined,
      totalRating,
      ratingCount: entry.ratings.length,
      userRating: userRating?.value || 0,
    };
  });

  return NextResponse.json(entriesWithUserRating);
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { term, definition, example } = await req.json();
  if (!term?.trim() || !definition?.trim()) {
    return NextResponse.json(
      { error: "Term and definition are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.dictionaryEntry.create({
    data: {
      term: term.trim(),
      definition: definition.trim(),
      example: example?.trim() || null,
      userId: ctx.userId,
      groupId: ctx.activeGroupId,
    },
    include: {
      user: { select: { id: true, name: true } },
      comments: true,
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ ...entry, totalRating: 0, ratingCount: 0, userRating: 0 });
}

export async function DELETE(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const entry = await prisma.dictionaryEntry.findUnique({ where: { id } });
  if (!entry || (entry.userId !== ctx.userId)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await prisma.dictionaryEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
