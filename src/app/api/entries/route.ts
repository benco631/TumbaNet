import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const entries = await prisma.entry.findMany({
    where: { month, year },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const summary = await prisma.monthlySummary.findUnique({
    where: { month_year: { month, year } },
  });

  return NextResponse.json({ entries, summary });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, title, tags, imageUrl } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const now = new Date();
  const userId = (session.user as { id: string }).id;

  const entry = await prisma.entry.create({
    data: {
      content: content.trim(),
      title: title?.trim() || "",
      tags: tags?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  notifyAllUsers({
    actorId: userId,
    actorName: entry.user.name,
    type: "HIGHLIGHT",
    message: `${entry.user.name} added a new monthly highlight${entry.title ? `: ${entry.title}` : ""}`,
    targetUrl: "/sikum",
  }).catch(() => {});

  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const entry = await prisma.entry.findUnique({ where: { id } });

  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
