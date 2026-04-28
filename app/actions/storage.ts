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
  putObjectBytes,
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
  const res = await fetch(input.sourceUrl, {
    redirect: "follow",
    headers: { "User-Agent": "SolvenRemoteUpload/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Remote fetch failed: ${res.status} ${res.statusText}`);
  }
  const maxBytes = plan.limits.maxSingleFileBytes;
  const len = res.headers.get("content-length");
  if (len != null && Number(len) > maxBytes) {
    throw new Error("Remote file too large");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) {
    throw new Error("Remote file too large");
  }
  await checkUploadAllowed(uid, buf.length);
  const contentType =
    input.contentType?.trim() ||
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const filename = resolveRemoteFilename({
    requestedName: input.filename,
    sourceUrl: input.sourceUrl,
    contentDisposition: res.headers.get("content-disposition"),
    contentType,
  });
  const key = buildObjectKey(uid, filename);
  await putObjectBytes({
    key,
    body: buf,
    contentType,
  });
  return { key, size: buf.length, contentType, filename };
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
      const maxBytes = plan.limits.maxSingleFileBytes;
      const res = await fetch(sourceUrl, {
        redirect: "follow",
        headers: { "User-Agent": "SolvenRemoteUpload/1.0" },
      });
      if (!res.ok) {
        throw new Error(`Remote fetch failed: ${res.status} ${res.statusText}`);
      }
      const len = res.headers.get("content-length");
      const parsedLen = len ? Number(len) : Number.NaN;
      if (Number.isFinite(parsedLen) && parsedLen > maxBytes) {
        throw new Error("Remote file too large");
      }
      patchRemoteJob(jobId, {
        stage: "downloading",
        totalBytes: Number.isFinite(parsedLen) ? parsedLen : null,
      });

      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let loadedBytes = 0;
      let prevBytes = 0;
      let prevAt = Date.now();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          loadedBytes += value.byteLength;
          if (loadedBytes > maxBytes) {
            throw new Error("Remote file too large");
          }
          chunks.push(value);
          const now = Date.now();
          const deltaMs = Math.max(now - prevAt, 1);
          const speedBps = ((loadedBytes - prevBytes) / deltaMs) * 1000;
          prevAt = now;
          prevBytes = loadedBytes;
          patchRemoteJob(jobId, {
            stage: "downloading",
            loadedBytes,
            speedBps,
          });
        }
      } else {
        const buf = new Uint8Array(await res.arrayBuffer());
        loadedBytes = buf.byteLength;
        if (loadedBytes > maxBytes) {
          throw new Error("Remote file too large");
        }
        chunks.push(buf);
        patchRemoteJob(jobId, {
          stage: "downloading",
          loadedBytes,
          totalBytes: loadedBytes,
          speedBps: 0,
        });
      }

      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      await checkUploadAllowed(uid, buf.length);
      patchRemoteJob(jobId, {
        stage: "uploading",
        loadedBytes: 0,
        totalBytes: buf.length,
        speedBps: 0,
      });
      const contentType =
        input.contentType?.trim() ||
        res.headers.get("content-type")?.split(";")[0]?.trim() ||
        "application/octet-stream";
      const filename = resolveRemoteFilename({
        requestedName: input.filename,
        sourceUrl,
        contentDisposition: res.headers.get("content-disposition"),
        contentType,
      });
      const key = buildObjectKey(uid, filename);
      await putObjectBytes({
        key,
        body: buf,
        contentType,
      });
      patchRemoteJob(jobId, {
        stage: "done",
        loadedBytes: buf.length,
        totalBytes: buf.length,
        speedBps: 0,
        key,
        size: buf.length,
        contentType,
        filename,
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
