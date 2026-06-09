import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "@/lib/db";
import { lastLoginMethod } from "better-auth/plugins";
import { allowNewSignUps, authAllowedHosts } from "@/lib/auth-config";

const signUpsEnabled = allowNewSignUps();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: authAllowedHosts(),
    protocol: "auto",
  },
  trustedProxyHeaders: true,
  plugins: [
    lastLoginMethod({
      storeInDatabase: true,
    }),
  ],
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    github: {
      prompt: "select_account",
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      disableSignUp: !signUpsEnabled,
    },
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      disableSignUp: !signUpsEnabled,
    },
  },
});
