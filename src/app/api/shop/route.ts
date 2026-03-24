import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all shop items (active only for regular users, all for admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;

  const items = await prisma.shopItem.findMany({
    where: isAdmin ? {} : { active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST create a new shop item (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
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
    },
  });

  return NextResponse.json(item, { status: 201 });
}

// PUT update a shop item (admin only)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
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
    return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
  }

  await prisma.shopItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
