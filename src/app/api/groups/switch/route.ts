import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/groups/switch — Switch active group
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verify the user is a member of this group
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { activeGroupId: groupId },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { memberships: true } } },
    });

    return NextResponse.json({ group });
  } catch (err) {
    console.error("Error switching group:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
