import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/groups/regenerate-code — Admin generates a new invite code
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

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Retry on the unlikely event of a collision with the unique index.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = nanoid(8);
      const collision = await prisma.group.findUnique({ where: { inviteCode: candidate } });
      if (collision) continue;
      const group = await prisma.group.update({
        where: { id: groupId },
        data: { inviteCode: candidate },
      });
      return NextResponse.json({ inviteCode: group.inviteCode });
    }

    return NextResponse.json({ error: "Could not generate a unique code, try again" }, { status: 500 });
  } catch (err) {
    console.error("Error regenerating invite code:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
