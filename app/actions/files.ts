"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { files } from "@/db/schema";
import { deleteFileNoCheck, getSignedDownloadUrl } from "@/utils/r2";

export async function getFileUrl(fileKey: string) {
  return await getSignedDownloadUrl(fileKey);
}

export async function deleteFile(fileKey: string) {
  const session = await auth();

  if (!session || !session.user)
    return { success: false, error: "User not found." };

  const [file] = await db
    .select()
    .from(files)
    .where(
      and(eq(files.id, fileKey), eq(files.ownerId, session.user.id as string)),
    );

  if (!file) return { success: false, error: "File not found." };

  try {
    await deleteFileNoCheck(`${file.ownerId}/${file.id}/${file.filename}`);
  } catch (err) {
    console.error("Error deleting file from storage:", err);
    return { success: false, error: "Error deleting file from storage." };
  }

  try {
    await db.delete(files).where(eq(files.id, fileKey));
  } catch (err) {
    console.error("Error deleting file from database:", err);
    return { success: false, error: "Error deleting file from database." };
  }

  return { success: true };
}

export async function downloadFileAccount(fileKey: string) {
  const session = await auth();

  if (!session || !session.user)
    return { success: false, error: "User not found." };

  const [file] = await db
    .select()
    .from(files)
    .where(
      and(eq(files.ownerId, session.user.id as string), eq(files.id, fileKey)),
    );

  if (file) {
    try {
      const fileUrl = await getSignedDownloadUrl(
        `${session.user.id}/${file.id}/${file.filename}`,
      );
      return { success: true, fileUrl };
    } catch (err) {
      console.error("Error getting download URL:", err);
      return { success: false, error: "Error getting download URL." };
    }
  }

  return {
    success: false,
    error: "An error occurred while getting the download link.",
  };
}
