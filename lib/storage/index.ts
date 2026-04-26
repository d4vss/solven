export { getR2Env, r2S3Endpoint, type R2Env } from "@/lib/storage/r2-env";
export { getR2S3Client } from "@/lib/storage/r2-client";
export {
  userStoragePrefix,
  assertUserOwnsKey,
  buildObjectKey,
} from "@/lib/storage/r2-keys";
export { normalizeFilenameForObjectKey } from "@/lib/storage/filename-normalize";
export {
  putObjectBytes,
  deleteObjectKey,
  headObject,
  getObjectBuffer,
  listObjectKeysUnderPrefix,
  createPresignedPutUrl,
  createPresignedGetUrl,
  uploadFromRemoteUrl,
} from "@/lib/storage/r2-operations";

export { requireSessionUserId } from "@/lib/storage/session";
