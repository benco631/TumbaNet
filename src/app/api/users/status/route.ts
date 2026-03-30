import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();
  if (typeof status !== "string" || status.length > 100) {
    return NextResponse.json(
      { error: "Status must be a string of max 100 characters" },
      { status: 400 }
    );
  }

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, name: true, status: true, tumbaCoins: true },
  });

  return NextResponse.json(user);
}
