"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function setupUser(username: string, email: string) {
  const session = await auth();

  if (!session || !session.user)
    return { success: false, error: "Not authenticated." };
  try {
    await db
      .update(users)
      .set({
        email,
        name: username,
        onboardingDone: true,
      })
      .where(eq(users.id, session.user.id as string));
  } catch (err) {
    console.error("DB insert went wrong:", err);
    return { success: false, error: "This username is already taken." };
  }

  return { success: true };
}
