"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { files } from "@/db/schema";
import { addDays } from "@/utils/helpers";
import { getSignedUrlForUpload as getSignedUrlForUploadR2 } from "@/utils/r2";
import { checkFileExistsR2 } from "@/utils/r2";

export async function getSignedUrlForUpload(
  fileName: string,
  fileSize: number,
  fileType: string,
) {
  const session = await auth();
  const ownerId = session?.user?.id;

  const fileKey = [...Array(8)]
    .map(
      () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
          Math.floor(Math.random() * 62)
        ],
    )
    .join("");

  const fileNameSlug = fileName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/\./g, "-");
  const fileId = `${fileNameSlug}-${fileKey}`;

  try {
    const r2Key = ownerId
      ? `${ownerId}/${fileId}/${fileName}`
      : `anonymous/${fileId}/${fileName}`;

    const signedUrl = await getSignedUrlForUploadR2(r2Key, fileType, fileName);

    return {
      success: true,
      content: {
        message: "Signed url successfully created.",
        variables: {
          signedUrl,
          fileId,
        },
      },
    };
  } catch {
    return {
      success: false,
      error: {
        message: "Error generating signed URL",
        code: 500,
      },
    };
  }
}

export async function confirmUploadCompletion(
  fileId: string,
  ownerId: string | null,
  fileName: string,
  fileSize: number,
  folderId?: string,
) {
  if (folderId && !ownerId) {
    return {
      success: false,
      error: {
        message: "Anonymous uploads cannot be placed in folders.",
        code: 403,
      },
    };
  }

  try {
    // Check if the file exists in R2
    const r2Key = ownerId
      ? `${ownerId}/${fileId}/${fileName}`
      : `anonymous/${fileId}/${fileName}`;
    const fileExists = await checkFileExistsR2(r2Key);

    if (!fileExists) {
      return {
        success: false,
        error: {
          message: "File not found in storage",
          code: 404,
        },
      };
    }

    // Create database entry
    await db.insert(files).values({
      id: fileId,
      filename: fileName,
      size: fileSize,
      ownerId: ownerId ?? null,
      folderId: folderId === "/" ? undefined : folderId,
      expiresAt: addDays(new Date(), 7),
      uploadedAt: new Date(),
      downloadCount: 0,
    });

    return {
      success: true,
      content: {
        message: "Upload confirmed and database entry created successfully.",
        variables: {
          fileId,
          ownerId,
          fileName,
          fileSize,
        },
      },
    };
  } catch {
    return {
      success: false,
      error: {
        message: "Error confirming upload",
        code: 500,
      },
    };
  }
}
