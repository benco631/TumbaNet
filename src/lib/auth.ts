import { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { getAdminAuth } from "./firebase-admin";

/**
 * Get the current user's id and activeGroupId from the session.
 * Returns null if not authenticated.
 */
export async function getSessionContext(): Promise<{
  userId: string;
  activeGroupId: string | null;
} | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; activeGroupId?: string | null } | undefined;
  if (!user?.id) return null;
  return { userId: user.id, activeGroupId: user.activeGroupId ?? null };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Firebase",
      credentials: {
        token: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          return null;
        }

        try {
          // Verify the Firebase ID token using firebase-admin
          const decodedToken = await getAdminAuth().verifyIdToken(credentials.token);
          
          if (!decodedToken.email) {
            throw new Error("Token does not contain an email address");
          }

          // Fetch user in Prisma by email (הכי בטוח ומונע שגיאות כפילות)
          const user = await prisma.user.findUnique({
            where: { email: decodedToken.email },
          });

          if (!user) {
            // במקום ליצור משתמש חדש ולהקריס את השרת, אנחנו פשוט זורקים שגיאה
            throw new Error("User not found");
          }

          // סנכרון: אם זה יוזר מטסטים ישנים שאין לו עדיין את ה-UID של פיירבייס, נעדכן לו אותו
          if (!user.firebaseUid) {
            await prisma.user.update({
              where: { email: user.email },
              data: { firebaseUid: decodedToken.uid },
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            activeGroupId: user.activeGroupId,
          };
        } catch (error) {
          console.error("Firebase token verification failed:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
        token.activeGroupId = (user as { activeGroupId?: string | null }).activeGroupId;
      }
      // Refresh activeGroupId on every session check to stay in sync
      if (trigger === "update" || !token.activeGroupId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { activeGroupId: true, isAdmin: true },
          });
          if (dbUser) {
            token.activeGroupId = dbUser.activeGroupId;
            token.isAdmin = dbUser.isAdmin;
          }
        } catch {
          // If DB is unavailable, use cached token values
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; isAdmin?: boolean; activeGroupId?: string | null }).id =
          token.id as string;
        (session.user as { id?: string; isAdmin?: boolean; activeGroupId?: string | null }).isAdmin =
          token.isAdmin as boolean;
        (session.user as { id?: string; isAdmin?: boolean; activeGroupId?: string | null }).activeGroupId =
          token.activeGroupId as string | null;
      }
      return session;
    },
  },
};