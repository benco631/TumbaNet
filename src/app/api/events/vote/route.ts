import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { optionId, pollId } = await req.json();

  if (!optionId || !pollId) {
    return NextResponse.json({ error: "optionId and pollId are required" }, { status: 400 });
  }

  // Verify the option belongs to the poll
  const option = await prisma.eventPollOption.findUnique({
    where: { id: optionId },
    include: { poll: true },
  });

  if (!option || option.pollId !== pollId) {
    return NextResponse.json({ error: "Invalid option for this poll" }, { status: 400 });
  }

  // Remove any existing vote by this user on any option of this poll
  const pollOptions = await prisma.eventPollOption.findMany({
    where: { pollId },
    select: { id: true },
  });
  const optionIds = pollOptions.map((o) => o.id);

  await prisma.eventPollVote.deleteMany({
    where: {
      userId,
      optionId: { in: optionIds },
    },
  });

  // Create the new vote
  await prisma.eventPollVote.create({
    data: { userId, optionId },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { pollId } = await req.json();

  if (!pollId) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 });
  }

  const pollOptions = await prisma.eventPollOption.findMany({
    where: { pollId },
    select: { id: true },
  });
  const optionIds = pollOptions.map((o) => o.id);

  await prisma.eventPollVote.deleteMany({
    where: {
      userId,
      optionId: { in: optionIds },
    },
  });

  return NextResponse.json({ success: true });
}
