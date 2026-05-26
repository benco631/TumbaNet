import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET a single user's profile with stats
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      nickname: true,
      tag: true,
      tumbaCoins: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          entries: true,
          dictionaryEntries: true,
          events: true,
          betsCreated: true,
          wagers: true,
          media: true,
          purchases: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// UPDATE user profile (own profile only)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  if (userId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { bio, nickname, tag } = body;

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      bio: bio !== undefined ? (bio.trim() || null) : undefined,
      nickname: nickname !== undefined ? (nickname.trim() || null) : undefined,
      tag: tag !== undefined ? (tag.trim() || null) : undefined,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      nickname: true,
      tag: true,
    },
  });

  return NextResponse.json(user);
}
