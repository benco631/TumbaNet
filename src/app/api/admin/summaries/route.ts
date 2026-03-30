import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { month, year, summary } = await req.json();
  if (!month || !year || !summary) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await prisma.monthlySummary.upsert({
    where: { month_year: { month, year } },
    update: { summary, committed: true },
    create: { month, year, summary, committed: true },
  });

  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id, summary } = await req.json();
  if (!id || !summary) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await prisma.monthlySummary.update({
    where: { id },
    data: { summary },
  });

  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await prisma.monthlySummary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
