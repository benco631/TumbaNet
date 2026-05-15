import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // עושה שאילתה ריקה רק כדי לוודא שהדאטה-בייס נשאר ער
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json(
      { status: "alive", message: "TumbaNet DB is awake!" }, 
      { status: 200 }
    );
  } catch (err) {
    console.error("Keep-alive error:", err);
    return NextResponse.json({ error: "Failed to wake DB" }, { status: 500 });
  }
}