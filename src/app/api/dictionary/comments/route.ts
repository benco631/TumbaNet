import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dictionaryEntryId, content } = await req.json();
  if (!dictionaryEntryId || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;

  const comment = await prisma.dictionaryComment.create({
    data: {
      content: content.trim(),
      userId,
      dictionaryEntryId,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(comment);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;

  const comment = await prisma.dictionaryComment.findUnique({ where: { id } });
  if (!comment || (comment.userId !== userId && !isAdmin)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await prisma.dictionaryComment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
