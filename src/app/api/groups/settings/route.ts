import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/groups/settings — Get group settings (admin only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verify admin
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { memberships: true } },
        memberships: {
          include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (err) {
    console.error("Error fetching group settings:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PUT /api/groups/settings — Update group settings (admin only)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, name, description, privacy } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verify admin
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const updateData: Record<string, string | null> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (privacy !== undefined && (privacy === "OPEN" || privacy === "CLOSED")) {
      updateData.privacy = privacy;
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
    });

    return NextResponse.json({ group });
  } catch (err) {
    console.error("Error updating group settings:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
