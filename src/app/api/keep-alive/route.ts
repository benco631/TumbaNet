import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// פקודה קריטית ל-Next.js: אל תשמור את התשובה הזו בקאש! 
// אנחנו חייבים שכל בקשה באמת תגיע לשרת ולדאטה-בייס.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // שאילתה הכי "זולה" ומהירה שיש - רק בודקים שהחיבור פתוח
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      status: "awake", 
      time: new Date().toISOString() 
    }, { status: 200 });

  } catch (error) {
    console.error("Keep-alive error:", error);
    return NextResponse.json({ error: "Failed to wake DB" }, { status: 500 });
  }
}