"use server";

import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { folders } from "@/db/schema";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { deleteFile } from "@/app/actions/files";
import { auth } from "@/auth";

const folderNameSchema = z
  .string()
  .min(1, "Folder name is required")
  .max(50, "Folder name is too long")
  .regex(
    /^[a-zA-Z0-9\s-]+$/,
    "Folder name can only contain letters, numbers, spaces, and hyphens",
  );

const RANDOM_ID_LENGTH = 8;

export async function createFolder(folderName: string, fileKeys: string[]) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      success: false,
      error: {
        message: "Unauthorized",
        code: 401,
      },
    };
  }

  try {
    const validatedName = folderNameSchema.parse(folderName);
    const folderNameSlug = validatedName.toLowerCase().replace(/\s+/g, "-");
    const randomId = [...Array(RANDOM_ID_LENGTH)]
      .map(
        () =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
            Math.floor(Math.random() * 62)
          ],
      )
      .join("");
    const folderId = `${folderNameSlug}-${randomId}`;
    const ownerId = session.user.id as string;
    const [owner] = await db.select().from(users).where(eq(users.id, ownerId));

    if (!owner) {
      return {
        success: false,
        error: {
          message: "Unauthorized",
          code: 401,
        },
      };
    }

    const [folder] = await db
      .insert(folders)
      .values({
        id: folderId,
        name: folderName,
        ownerId: ownerId,
      })
      .returning();

    const results = await Promise.all(
      fileKeys.map(async (fileKey) => {
        const [file] = await db
          .select()
          .from(files)
          .where(and(eq(files.ownerId, ownerId), eq(files.id, fileKey)));

        if (file) {
          await db.update(files).set({ folderId }).where(eq(files.id, fileKey));

          return fileKey;
        }

        return null;
      }),
    );

    const validFileKeys = results.filter((key): key is string => !!key);

    await db
      .update(folders)
      .set({
        fileKeys: validFileKeys,
      })
      .where(eq(folders.id, folderId));

    return { success: true, folderPath: `/folder/${folder.id}` };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: { message: error.errors[0].message } };
    }

    return { success: false, error: { message: "Failed to create folder" } };
  }
}

export async function deleteFolder(folderId: string) {
  const session = await auth();

  if (!session || !session.user) return {
    success: false,
    message: "User not found.",
  };

  const [folder] = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.id, folderId),
        eq(folders.ownerId, session.user.id as string),
      ),
    );

  if (!folder) return {
    success: false,
    message: "Folder not found."
  };

  try {
    await Promise.all(folder.fileKeys.map((fileKey) => deleteFile(fileKey)));
  } catch {
    return {
      success: false,
      message: "Something went wrong removing the file from the server."
    };
  }

  try {
    await db.delete(files).where(eq(files.folderId, folderId));
    await db.delete(folders).where(eq(folders.id, folderId));
  } catch {
    return {
      success: false,
      message: "Something went wrong deleting the folder from the database."
    }
  }

  return {
    success: true
  };
}

export async function deleteAllFilesAndFolders() {
  const session = await auth();

  if (!session || !session.user)
    return {
      success: false,
      message: "User not found.",
    };

  const allFiles = await db
    .select()
    .from(files)
    .where(eq(files.ownerId, session.user.id as string));

  try {
    await Promise.all(
      allFiles.map((file) =>
        deleteFile(`${session.user.id}/${file.id}/${file.filename}`),
      ),
    );
  } catch {
    return {
      success: false,
      message:
        "Error | Something went wrong removing the files from the server.",
    };
  }

  try {
    await db.delete(files).where(eq(files.ownerId, session.user.id as string));
    await db
      .delete(folders)
      .where(eq(folders.ownerId, session.user.id as string));
  } catch {
    return {
      success: false,
      message: "Error | Something went wrong deleting the files and folders.",
    };
  }

  return {
    success: true,
    message: "All files and folders deleted successfully.",
  };
}

export async function softDeleteFolder(folderKey: string) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      success: false,
      error: {
        message: "Unauthorized",
        code: 401,
      },
    };
  }

  const ownerId = session.user.id as string;

  const [owner] = await db.select().from(users).where(eq(users.id, ownerId));

  if (!owner) {
    return {
      success: false,
      error: {
        message: "Unauthorized",
        code: 401,
      },
    };
  }

  try {
    await db
      .update(files)
      .set({ folderId: null })
      .where(and(eq(files.ownerId, ownerId), eq(files.folderId, folderKey)));

    await db
      .delete(folders)
      .where(and(eq(folders.ownerId, ownerId), eq(folders.id, folderKey)));

    return { success: true, content: { message: "Folder deleted" } };
  } catch {
    return {
      success: false,
      error: {
        message: "Error deleting folder",
        code: 500,
      },
    };
  }
}

export async function createNewEmptyFolder(folderName: string) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      success: false,
      error: {
        message: "Unauthorized",
        code: 401,
      },
    };
  }

  try {
    const validatedName = folderNameSchema.parse(folderName);
    const folderNameSlug = validatedName.toLowerCase().replace(/\s+/g, "-");
    const randomId = [...Array(8)]
      .map(() => "0123456789"[Math.floor(Math.random() * 10)])
      .join("");
    const folderId = `${folderNameSlug}-${randomId}`;
    const ownerId = session.user.id as string;

    const [folder] = await db
      .insert(folders)
      .values({
        id: folderId,
        name: folderName,
        ownerId: ownerId,
      })
      .returning();

    return { success: true, folder };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: { message: error.errors[0].message } };
    }

    return { success: false, error: { message: "Failed to create folder" } };
  }
}
