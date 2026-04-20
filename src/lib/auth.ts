import { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          activeGroupId: user.activeGroupId,
        };
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
