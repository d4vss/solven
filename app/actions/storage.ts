"use server";

import {
  assertRemoteUploadAllowed,
  checkUploadAllowed,
  getResolvedPlanForUser,
} from "@/lib/plans/enforcement";
import {
  assertUserOwnsKey,
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteObjectKey,
  listObjectKeysUnderPrefix,
  uploadFromRemoteUrl,
  buildObjectKey,
  userStoragePrefix,
} from "@/lib/storage";
import { requireSessionUserId } from "@/lib/storage/session";

async function userId() {
  return requireSessionUserId();
}

/** List object keys under your user prefix (optionally relative `prefix`). */
export async function listMyStorageKeysAction(relativePrefix = "") {
  const uid = await userId();
  const base = userStoragePrefix(uid);
  const full =
    relativePrefix === "" || relativePrefix === "/"
      ? base
      : `${base}${relativePrefix.replace(/^\//, "")}`;
  return listObjectKeysUnderPrefix(full);
}

/** Delete one object; key must belong to the signed-in user. */
export async function deleteMyStorageObjectAction(key: string) {
  const uid = await userId();
  assertUserOwnsKey(key, uid);
  await deleteObjectKey(key);
}

/** Presigned PUT for direct browser → R2 upload (same helper as `/api/storage/presign/put`). */
export async function presignMyUploadAction(input: {
  filename: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}) {
  const uid = await userId();
  await checkUploadAllowed(uid, input.sizeBytes);
  const key = buildObjectKey(uid, input.filename);
  const url = await createPresignedPutUrl({
    key,
    contentType: input.contentType,
    expectedSizeBytes: input.sizeBytes,
    expiresInSeconds: input.expiresInSeconds,
  });
  return { url, key };
}

/** Presigned GET for temporary download link. */
export async function presignMyDownloadAction(input: {
  key: string;
  expiresInSeconds?: number;
  downloadFileName?: string | null;
}) {
  const uid = await userId();
  assertUserOwnsKey(input.key, uid);
  const url = await createPresignedGetUrl({
    key: input.key,
    expiresInSeconds: input.expiresInSeconds,
    downloadFileName: input.downloadFileName,
  });
  return { url };
}

/** Pull a remote URL server-side and store in R2. */
export async function remoteUploadToMyStorageAction(input: {
  sourceUrl: string;
  filename: string;
  contentType?: string;
}) {
  const uid = await userId();
  const key = buildObjectKey(uid, input.filename);
  const { plan } = await getResolvedPlanForUser(uid);
  await assertRemoteUploadAllowed(uid);
  return uploadFromRemoteUrl({
    sourceUrl: input.sourceUrl,
    key,
    contentType: input.contentType,
    maxBytes: plan.limits.maxSingleFileBytes,
    beforePut: async (buf) => {
        await checkUploadAllowed(uid, buf.length);
    },
  });
}
