import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all shop items (scoped to active group)
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.shopItem.findMany({
    where: {
      active: true,
      OR: [
        { groupId: ctx.activeGroupId },
        { source: "BUILT_IN", groupId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST create a new shop item (admin only)
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check group admin status
  if (!ctx.activeGroupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: ctx.userId, groupId: ctx.activeGroupId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, price, imageUrl, category } = body;

  if (!title?.trim() || !description?.trim() || !price || price <= 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const item = await prisma.shopItem.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      price: Math.floor(price),
      imageUrl: imageUrl?.trim() || null,
      category: category?.trim() || "general",
      groupId: ctx.activeGroupId,
      createdById: ctx.userId,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

// PUT update a shop item (admin only)
export async function PUT(req: NextRequest) {
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

  const body = await req.json();
  const { id, title, description, price, imageUrl, category, active } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (price !== undefined) updateData.price = Math.floor(price);
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
  if (category !== undefined) updateData.category = category.trim();
  if (active !== undefined) updateData.active = Boolean(active);

  const item = await prisma.shopItem.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(item);
}

// DELETE a shop item (admin only)
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
    return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
  }

  await prisma.shopItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
