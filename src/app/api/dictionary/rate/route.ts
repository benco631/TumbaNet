import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dictionaryEntryId, value } = await req.json();
  if (!dictionaryEntryId || (value !== 1 && value !== -1 && value !== 0)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;

  if (value === 0) {
    await prisma.dictionaryRating.deleteMany({
      where: { userId, dictionaryEntryId },
    });
  } else {
    await prisma.dictionaryRating.upsert({
      where: {
        userId_dictionaryEntryId: { userId, dictionaryEntryId },
      },
      update: { value },
      create: { userId, dictionaryEntryId, value },
    });
  }

  const ratings = await prisma.dictionaryRating.findMany({
    where: { dictionaryEntryId },
  });
  const totalRating = ratings.reduce((sum, r) => sum + r.value, 0);
  const userRating = ratings.find((r) => r.userId === userId);

  return NextResponse.json({
    totalRating,
    ratingCount: ratings.length,
    userRating: userRating?.value || 0,
  });
}
