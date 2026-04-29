import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { APP_ENV, isAllowedStagingEmail } from "@/lib/env";

const STAGING_BLOCKED_PATH = "/staging-blocked";

const PUBLIC_PATHS = [
  STAGING_BLOCKED_PATH,
  "/login",
  "/register",
  "/api/auth",
  "/api/register",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function middleware(req: NextRequest) {
  if (APP_ENV !== "staging") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const email = (token?.email as string | null | undefined) ?? null;
  if (isAllowedStagingEmail(email)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Staging access only" },
      { status: 403 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = STAGING_BLOCKED_PATH;
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|uploads|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt)).*)"],
};
