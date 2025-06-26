import NextAuth, { User } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";

import { db } from "./db";
import { users } from "./db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [GitHub, Google],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    // newUser: "/onboarding" - Handled by middleware already
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async signIn() {
      return true;
    },
    async session({ session, token, trigger }) {
      if (trigger === "update" && session) {
        if ((token.user as User).id != session.user.id) {
          return session;
        }
        session.user = { ...session.user, ...(token.user as object) };
      }
      session.user = token.user as any;

      return session;
    },
    async jwt({ token, user, trigger, session, account, profile }) {
      let dbUser = null;
      let userId = null;

      if (trigger === "signIn" && account) {
        userId = `${account.provider}.${account.providerAccountId}`;
        [dbUser] = await db.select().from(users).where(eq(users.id, userId));

        if (!dbUser) {
          await db.insert(users).values({
            id: userId,
            email: profile?.email as string,
            name: profile?.name as string,
            onboardingDone: false,
          });
        }
      }

      if (user) {
        token.user = user;
        (token.user as any).id = userId as string;
        (token.user as any).onboardingDone = dbUser
          ? dbUser.onboardingDone
          : false;
      }
      if (account) {
        token.name = account.name as string;
        token.id = `${account.provider}.${account.providerAccountId}`;
        token.onboardingDone = dbUser ? dbUser.onboardingDone : false;
      }
      if (trigger === "update" && session) {
        if ((token.user as User).id != session.user.id) {
          return token;
        }
        token = { ...token, user: { ...session.user } };
      }

      return token;
    },
  },
});
