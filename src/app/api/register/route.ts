import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { firebaseUid, email, name } = await req.json();

    if (!firebaseUid || !email || !name) {
      return NextResponse.json(
        { error: "Missing required fields: firebaseUid, email, name" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User already registered" },
        { status: 400 }
      );
    }

    // Check if email is already in use (shouldn't happen in normal flow)
    const emailExists = await prisma.user.findUnique({
      where: { email },
    });

    if (emailExists) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Create user in Prisma
    const user = await prisma.user.create({
      data: {
        firebaseUid,
        name,
        email,
        tumbaCoins: 100,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      firebaseUid: user.firebaseUid,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
