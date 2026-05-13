"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useGroup } from "./GroupProvider";
import GroupOnboarding from "./GroupOnboarding";
import SplashScreen from "./SplashScreen";

const UNGATED_PATHS = ["/login", "/register", "/api", "/groups", "/join", "/staging-blocked"];

export default function GroupGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { hasNoGroups, isLoading: isGroupLoading } = useGroup();
  const pathname = usePathname();

  // 1. עמודים ציבוריים - תמיד פתוחים ללא השהיה
  const isUngated = UNGATED_PATHS.some((p) => pathname.startsWith(p));
  if (isUngated) {
    return <>{children}</>;
  }

  // 2. בזמן שבודקים את זהות המשתמש (NextAuth)
  if (status === "loading") {
    return <SplashScreen />;
  }

  // 3. אם המשתמש לא מחובר בכלל - תן ל-page.tsx לטפל בו (להציג WelcomePage)
  if (status === "unauthenticated" || !session) {
    return <>{children}</>;
  }

  // 4. המשתמש מחובר, אבל אנחנו עדיין מושכים את הקבוצות שלו מה-DB
  // זה השלב שבו קרה ה"פלאש" - עכשיו אנחנו עוצרים אותו כאן
  if (isGroupLoading) {
    return <SplashScreen />;
  }

  // 5. רק אחרי שסיימנו לטעון הכל, בודקים אם באמת אין קבוצות
  if (hasNoGroups) {
    return <GroupOnboarding />;
  }

  // 6. הכל מוכן - יש משתמש ויש קבוצות
  return <>{children}</>;
}