import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { APP_ENV, isAllowedStagingEmail } from "@/lib/env";

const STAGING_BLOCKED_PATH = "/staging-blocked";

// רשימת העמודים שפתוחים לכולם (גם לאורחים שלא מחוברים)
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
  const { pathname } = req.nextUrl;

  // 1. אם זה נתיב ציבורי (כמו התחברות) - ניתן לו לעבור בלי לבדוק כלום
  if (isPublicPath(pathname)) return NextResponse.next();

  // 2. שולפים את הסשן מ-NextAuth
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 3. הגנת התחברות (חסם הכניסה הראשי לכל האפליקציה)
  // אם אין טוקן (משתמש לא מחובר) והוא מנסה לגשת לעמוד פרטי
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // זורקים אותו לעמוד ההתחברות
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 4. הגנת ה-Staging המקורית שלכם
  if (APP_ENV === "staging") {
    const email = (token?.email as string | null | undefined) ?? null;
    if (!isAllowedStagingEmail(email)) {
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
  }

  // 5. המשתמש מחובר, ואם אנחנו בסטייג'ינג גם יש לו אישור. הכל תקין!
  return NextResponse.next();
}

export const config = {
  // הרשימה הזו אומרת ל-Middleware על אילו עמודים לא לרוץ (תמונות, קבצי מערכת וכו')
  matcher: ["/((?!_next|favicon.ico|uploads|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt)).*)"],
};