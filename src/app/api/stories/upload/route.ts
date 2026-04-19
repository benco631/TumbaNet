import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `story_${randomUUID()}.${ext}`;
    
    // שומרים בתיקיית uploads/stories ולא באלבום הראשי
    const uploadDir = path.join(process.cwd(), "public", "uploads", "stories");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    // מחזירים רק את הקישור, בלי לשמור כלום במסד הנתונים של ה-Media!
    return NextResponse.json({ url: `/uploads/stories/${filename}` });
  } catch (error) {
    console.error("Story upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}