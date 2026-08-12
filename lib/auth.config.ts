import type { NextAuthConfig } from "next-auth";

// Edge-safe base config: no providers here, so this file never pulls in
// bcrypt or the Prisma/better-sqlite3 client. lib/auth.ts extends this with
// the Credentials provider for use in route handlers/server components;
// proxy.ts uses this file directly since it runs on the Edge runtime.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
