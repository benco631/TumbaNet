import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  isAdmin?: boolean;
}

/** Reads the session and returns `{ user }` or a 401 NextResponse. */
export async function requireUser(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

/** Reads the session and requires `isAdmin`. Returns user or a 401/403. */
export async function requireAdmin(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const auth = await requireUser();
  if ("error" in auth) return auth;
  if (!auth.user.isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}

/** Consistent error-response shape. */
export function toErrorResponse(err: unknown, fallback = "Server error", status = 500) {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  return NextResponse.json({ error: message }, { status });
}
