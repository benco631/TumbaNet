import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/groups — Create a new group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, privacy } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const validPrivacy = privacy === "CLOSED" ? "CLOSED" : "OPEN";

    // Create group + membership + set as active in a single transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          privacy: validPrivacy,
          inviteCode: nanoid(8),
          createdById: userId,
        },
      });

      await tx.groupMembership.create({
        data: {
          userId,
          groupId: newGroup.id,
          role: "ADMIN",
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeGroupId: newGroup.id },
      });

      return newGroup;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("Error creating group:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// GET /api/groups — Get current active group info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeGroupId: true },
    });

    if (!user?.activeGroupId) {
      return NextResponse.json({ group: null });
    }

    const group = await prisma.group.findUnique({
      where: { id: user.activeGroupId },
      include: {
        _count: { select: { memberships: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ group: null });
    }

    // Check the user's role in this group
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    return NextResponse.json({
      group: {
        ...group,
        memberCount: group._count.memberships,
        myRole: membership?.role || null,
      },
    });
  } catch (err) {
    console.error("Error fetching group:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
