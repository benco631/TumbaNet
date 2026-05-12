import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET activity logs - supports ?type=HOST or ?type=CAR, or all
export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { groupId: ctx.activeGroupId };
  if (type) where.type = type.toUpperCase();

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

// POST create a new activity log (Open to all members)
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // חובה להיות משויך לקבוצה כדי לדווח
  if (!ctx.activeGroupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  // --- הסרנו את בדיקת האדמין! כל אחד יכול לדווח ---

  const body = await req.json();
  const { type, distance, passengers, attendees, shortNotice } = body;

  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  const typeUpper = type.toUpperCase();
  const validTypes = ["HOST", "CAR"];
  if (!validTypes.includes(typeUpper)) {
    return NextResponse.json({ error: "Invalid type. Use HOST or CAR" }, { status: 400 });
  }

  // תרגום המרחק מהמודל לקילומטרים עבור מנוע ההישגים
  let distanceKm: number | null = null;
  if (typeUpper === "CAR") {
    if (distance === "SHORT") distanceKm = 5;
    else if (distance === "MEDIUM") distanceKm = 15;
    else if (distance === "LONG") distanceKm = 40;
  }

  // יצירת הדיווח
  const log = await prisma.activityLog.create({
    data: {
      userId: ctx.userId, // אבטחה: אנחנו כופים את ה-ID של מי שלחץ על הכפתור, אי אפשר לזייף!
      type: typeUpper,
      groupId: ctx.activeGroupId,
      // שומרים רק את הנתונים שרלוונטיים לסוג הפעילות שנבחרה
      passengerCount: typeUpper === "CAR" ? passengers : null,
      distanceKm: distanceKm,
      attendeeCount: typeUpper === "HOST" ? attendees : null,
      shortNotice: typeUpper === "HOST" ? Boolean(shortNotice) : false,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(log, { status: 201 });
}

// DELETE an activity log (Group Admin or Global Admin only)
export async function DELETE(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    // 1. נשלוף את המשתמש כדי לבדוק אם הוא אדמין מערכת (Global Admin)
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { isAdmin: true }
    });

    // 2. נשלוף את הפעילות כדי לדעת לאיזו קבוצה היא שייכת
    const activity = await prisma.activityLog.findUnique({
      where: { id },
    });

    if (!activity || !activity.groupId) {
      return NextResponse.json({ error: "Activity not found or missing group" }, { status: 404 });
    }

    // 3. בדיקת הרשאות: האם המשתמש הוא אדמין מערכת או אדמין בקבוצה הרלוונטית?
    let isAuthorized = currentUser?.isAdmin === true;

    if (!isAuthorized) {
      const membership = await prisma.groupMembership.findUnique({
        where: { 
          userId_groupId: { 
            userId: ctx.userId, 
            groupId: activity.groupId 
          } 
        },
      });
      if (membership?.role === "ADMIN") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. המחיקה בפועל
    await prisma.activityLog.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}