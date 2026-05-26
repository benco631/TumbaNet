import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only show members of the active group
  const users = ctx.activeGroupId
    ? await prisma.user.findMany({
        where: {
          groupMemberships: { some: { groupId: ctx.activeGroupId } },
        },
        select: {
          id: true,
          name: true,
          tumbaCoins: true,
          avatar: true,
          status: true,
          createdAt: true,
        },
        orderBy: { tumbaCoins: "desc" },
      })
    : await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          tumbaCoins: true,
          avatar: true,
          status: true,
          createdAt: true,
        },
        orderBy: { tumbaCoins: "desc" },
      });

  return NextResponse.json(users);
}
