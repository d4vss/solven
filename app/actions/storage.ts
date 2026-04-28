"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
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
  getR2Env,
  getR2S3Client,
  listObjectKeysUnderPrefix,
  buildObjectKey,
  userStoragePrefix,
} from "@/lib/storage";
import { requireSessionUserId } from "@/lib/storage/session";

async function userId() {
  return requireSessionUserId();
}

function extensionFromMime(contentType: string | null | undefined) {
  if (!contentType) return "";
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    normalized === "application/octet-stream" ||
    normalized === "binary/octet-stream"
  ) {
    return "";
  }
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/json": "json",
    "application/xml": "xml",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/html": "html",
    "text/markdown": "md",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  if (map[normalized]) return map[normalized];
  if (!normalized.includes("/")) return "";
  const tail = normalized.split("/")[1] ?? "";
  if (!tail) return "";
  if (tail === "octet-stream") return "";
  return tail.replace(/^x-/, "").replace(/\+xml$/, "");
}

function filenameFromUrlPath(rawUrl: string) {
  try {
    const pathname = new URL(rawUrl).pathname;
    const part = pathname.split("/").filter(Boolean).pop();
    if (!part) return "";
    return decodeURIComponent(part).trim();
  } catch {
    return "";
  }
}

function filenameFromContentDisposition(header: string | null) {
  if (!header) return "";
  const starMatch = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (starMatch?.[1]) {
    const raw = starMatch[1].trim().replace(/^UTF-8''/i, "");
    try {
      return decodeURIComponent(raw).replace(/^["']|["']$/g, "").trim();
    } catch {
      return raw.replace(/^["']|["']$/g, "").trim();
    }
  }
  const plainMatch = /filename\s*=\s*([^;]+)/i.exec(header);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim().replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return cleaned || "remote-file";
}

function ensureExtension(name: string, contentType: string | null | undefined) {
  const trimmed = name.trim();
  if (!trimmed) return name;
  const dotIdx = trimmed.lastIndexOf(".");
  if (dotIdx > 0 && dotIdx < trimmed.length - 1) return trimmed;
  const ext = extensionFromMime(contentType);
  return ext ? `${trimmed}.${ext}` : trimmed;
}

function resolveRemoteFilename(input: {
  requestedName?: string;
  sourceUrl: string;
  contentDisposition: string | null;
  contentType: string | null;
}) {
  const requested = input.requestedName?.trim() ?? "";
  const fromDisposition = filenameFromContentDisposition(input.contentDisposition);
  const fromUrl = filenameFromUrlPath(input.sourceUrl);
  const base = requested || fromDisposition || fromUrl || "remote-file";
  return ensureExtension(sanitizeFilename(base), input.contentType);
}

async function streamRemoteFileToStorage(input: {
  userId: string;
  sourceUrl: string;
  requestedName?: string;
  requestedContentType?: string;
  maxBytes: number;
  onProgress?: (p: { loadedBytes: number; totalBytes: number | null; speedBps: number }) => void;
}) {
  const res = await fetch(input.sourceUrl, {
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": "SolvenRemoteUpload/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Remote fetch failed: ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error("Remote response is not streamable.");
  }

  const maxBytes = input.maxBytes;
  const len = res.headers.get("content-length");
  const declaredTotal = len ? Number(len) : Number.NaN;
  const totalBytes = Number.isFinite(declaredTotal) ? declaredTotal : null;
  if (totalBytes !== null && totalBytes > maxBytes) {
    throw new Error("Remote file too large");
  }
  if (totalBytes !== null) {
    await checkUploadAllowed(input.userId, totalBytes);
  }

  const contentType =
    input.requestedContentType?.trim() ||
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const filename = resolveRemoteFilename({
    requestedName: input.requestedName,
    sourceUrl: input.sourceUrl,
    contentDisposition: res.headers.get("content-disposition"),
    contentType,
  });
  const key = buildObjectKey(input.userId, filename);

  let loadedBytes = 0;
  let prevLoadedBytes = 0;
  let prevAt = Date.now();
  const stream = Readable.fromWeb(res.body as NodeReadableStream<Uint8Array>).pipe(
    new Transform({
      transform(chunk, _encoding, callback) {
        const size = Buffer.isBuffer(chunk)
          ? chunk.length
          : chunk instanceof Uint8Array
            ? chunk.byteLength
            : Buffer.byteLength(String(chunk));
        loadedBytes += size;
        if (loadedBytes > maxBytes) {
          callback(new Error("Remote file too large"));
          return;
        }
        const now = Date.now();
        const deltaMs = Math.max(now - prevAt, 1);
        const speedBps = ((loadedBytes - prevLoadedBytes) / deltaMs) * 1000;
        prevLoadedBytes = loadedBytes;
        prevAt = now;
        input.onProgress?.({
          loadedBytes,
          totalBytes,
          speedBps,
        });
        callback(null, chunk);
      },
    }),
  );

  try {
    const env = getR2Env();
    await getR2S3Client().send(
      new PutObjectCommand({
        Bucket: env.bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
        ...(totalBytes !== null ? { ContentLength: totalBytes } : {}),
      }),
    );
  } catch (e) {
    await deleteObjectKey(key).catch(() => {});
    throw e;
  }

  try {
    await checkUploadAllowed(input.userId, loadedBytes);
  } catch (e) {
    await deleteObjectKey(key).catch(() => {});
    throw e;
  }

  return { key, size: loadedBytes, contentType, filename, totalBytes };
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
  filename?: string;
  contentType?: string;
}) {
  const uid = await userId();
  const url = new URL(input.sourceUrl);
  if (url.protocol !== "https:") {
    throw new Error("Remote URL must use HTTPS.");
  }
  const { plan } = await getResolvedPlanForUser(uid);
  await assertRemoteUploadAllowed(uid);
  const out = await streamRemoteFileToStorage({
    userId: uid,
    sourceUrl: input.sourceUrl,
    requestedName: input.filename,
    requestedContentType: input.contentType,
    maxBytes: plan.limits.maxSingleFileBytes,
  });
  return {
    key: out.key,
    size: out.size,
    contentType: out.contentType,
    filename: out.filename,
  };
}

type RemoteUploadStage =
  | "queued"
  | "downloading"
  | "uploading"
  | "done"
  | "error";

type RemoteUploadJob = {
  id: string;
  userId: string;
  stage: RemoteUploadStage;
  loadedBytes: number;
  totalBytes: number | null;
  speedBps: number;
  key?: string;
  size?: number;
  contentType?: string;
  filename?: string;
  error?: string;
  updatedAt: number;
};

const remoteUploadJobs = new Map<string, RemoteUploadJob>();
const REMOTE_JOB_TTL_MS = 10 * 60_000;

function putRemoteJob(job: RemoteUploadJob) {
  remoteUploadJobs.set(job.id, { ...job, updatedAt: Date.now() });
}

function patchRemoteJob(id: string, patch: Partial<RemoteUploadJob>) {
  const prev = remoteUploadJobs.get(id);
  if (!prev) return;
  putRemoteJob({ ...prev, ...patch, id: prev.id, userId: prev.userId });
}

function cleanupRemoteJobs() {
  const now = Date.now();
  for (const [id, job] of remoteUploadJobs.entries()) {
    if (now - job.updatedAt > REMOTE_JOB_TTL_MS) {
      remoteUploadJobs.delete(id);
    }
  }
}

export async function startRemoteUploadJobAction(input: {
  sourceUrl: string;
  filename?: string;
  contentType?: string;
}) {
  cleanupRemoteJobs();
  const uid = await userId();
  const sourceUrl = input.sourceUrl.trim();
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:") {
    throw new Error("Remote URL must use HTTPS.");
  }
  const jobId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  putRemoteJob({
    id: jobId,
    userId: uid,
    stage: "queued",
    loadedBytes: 0,
    totalBytes: null,
    speedBps: 0,
    updatedAt: Date.now(),
  });

  void (async () => {
    try {
      await assertRemoteUploadAllowed(uid);
      const { plan } = await getResolvedPlanForUser(uid);
      patchRemoteJob(jobId, {
        stage: "uploading",
        loadedBytes: 0,
        totalBytes: null,
        speedBps: 0,
      });
      const out = await streamRemoteFileToStorage({
        userId: uid,
        sourceUrl,
        requestedName: input.filename,
        requestedContentType: input.contentType,
        maxBytes: plan.limits.maxSingleFileBytes,
        onProgress: ({ loadedBytes, totalBytes, speedBps }) => {
          patchRemoteJob(jobId, {
            stage: "uploading",
            loadedBytes,
            totalBytes,
            speedBps,
          });
        },
      });
      patchRemoteJob(jobId, {
        stage: "done",
        loadedBytes: out.size,
        totalBytes: out.totalBytes ?? out.size,
        speedBps: 0,
        key: out.key,
        size: out.size,
        contentType: out.contentType,
        filename: out.filename,
      });
    } catch (e) {
      patchRemoteJob(jobId, {
        stage: "error",
        error: (e as Error).message ?? "Remote upload failed.",
      });
    }
  })();

  return { jobId };
}

export async function getRemoteUploadJobAction(jobId: string) {
  cleanupRemoteJobs();
  const uid = await userId();
  const job = remoteUploadJobs.get(jobId);
  if (!job || job.userId !== uid) {
    return null;
  }
  return {
    id: job.id,
    stage: job.stage,
    loadedBytes: job.loadedBytes,
    totalBytes: job.totalBytes,
    speedBps: job.speedBps,
    key: job.key,
    size: job.size,
    contentType: job.contentType,
    filename: job.filename,
    error: job.error,
  };
}
