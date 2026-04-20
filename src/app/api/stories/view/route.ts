import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { storyId } = await req.json();

  if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

  try {
    // שומרים את הצפייה. השתמשתי ב-upsert כדי שגם אם השרת יקבל את הבקשה פעמיים, הוא לא יקרוס
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: {},
      create: { storyId, userId }
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to mark viewed" }, { status: 500 });
  }
}