import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentContentDisposition } from "@/lib/storage/content-disposition";
import { getR2Env } from "@/lib/storage/r2-env";
import { getR2S3Client } from "@/lib/storage/r2-client";

const DEFAULT_PRESIGN_PUT_TTL = 120;
const DEFAULT_PRESIGN_GET_TTL = 300;

export async function putObjectBytes(input: {
  key: string;
  body: Uint8Array | Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}) {
  const env = getR2Env();
  await getR2S3Client().send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata,
    }),
  );
}

export async function deleteObjectKey(key: string) {
  const env = getR2Env();
  await getR2S3Client().send(
    new DeleteObjectCommand({ Bucket: env.bucket, Key: key }),
  );
}

export async function headObject(key: string) {
  const env = getR2Env();
  return getR2S3Client().send(
    new HeadObjectCommand({ Bucket: env.bucket, Key: key }),
  );
}

export async function getObjectBuffer(key: string) {
  const env = getR2Env();
  const out = await getR2S3Client().send(
    new GetObjectCommand({ Bucket: env.bucket, Key: key }),
  );
  if (!out.Body) {
    throw new Error("Empty object body");
  }
  return {
    buffer: Buffer.from(await out.Body.transformToByteArray()),
    contentType: out.ContentType ?? "application/octet-stream",
    metadata: out.Metadata,
  };
}

export async function listObjectKeysUnderPrefix(prefix: string, maxKeys = 500) {
  const env = getR2Env();
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await getR2S3Client().send(
      new ListObjectsV2Command({
        Bucket: env.bucket,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: Math.min(1000, maxKeys - keys.length),
      }),
    );
    for (const obj of page.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token && keys.length < maxKeys);
  return keys;
}

export async function createPresignedPutUrl(input: {
  key: string;
  contentType: string;
  expectedSizeBytes?: number;
  expiresInSeconds?: number;
}) {
  const env = getR2Env();
  const expiresIn = Math.min(
    120,
    Math.max(60, Math.floor(input.expiresInSeconds ?? DEFAULT_PRESIGN_PUT_TTL)),
  );
  const cmd = new PutObjectCommand({
    Bucket: env.bucket,
    Key: input.key,
    ContentType: input.contentType,
    ...(typeof input.expectedSizeBytes === "number"
      ? { ContentLength: input.expectedSizeBytes }
      : {}),
  });
  return getSignedUrl(getR2S3Client(), cmd, {
    expiresIn,
  });
}

export async function createPresignedGetUrl(input: {
  key: string;
  expiresInSeconds?: number;
  /** Browser download name (original display filename). */
  downloadFileName?: string | null;
}) {
  const env = getR2Env();
  const expiresIn = Math.min(
    300,
    Math.max(60, Math.floor(input.expiresInSeconds ?? DEFAULT_PRESIGN_GET_TTL)),
  );
  const disposition =
    input.downloadFileName && input.downloadFileName.trim().length > 0
      ? attachmentContentDisposition(input.downloadFileName.trim())
      : undefined;
  const cmd = new GetObjectCommand({
    Bucket: env.bucket,
    Key: input.key,
    ...(disposition ? { ResponseContentDisposition: disposition } : {}),
  });
  return getSignedUrl(getR2S3Client(), cmd, {
    expiresIn,
  });
}

const REMOTE_MAX_BYTES = 50 * 1024 * 1024;

export async function uploadFromRemoteUrl(input: {
  sourceUrl: string;
  key: string;
  contentType?: string;
  maxBytes?: number;
  beforePut?: (buf: Buffer) => void | Promise<void>;
}) {
  const url = new URL(input.sourceUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Remote URL must be http or https");
  }

  const res = await fetch(input.sourceUrl, {
    redirect: "follow",
    headers: { "User-Agent": "SolvenRemoteUpload/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Remote fetch failed: ${res.status} ${res.statusText}`);
  }

  const len = res.headers.get("content-length");
  const max = input.maxBytes ?? REMOTE_MAX_BYTES;
  if (len != null && Number(len) > max) {
    throw new Error("Remote file too large");
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > max) {
    throw new Error("Remote file too large");
  }

  if (input.beforePut) {
    await input.beforePut(buf);
  }

  const contentType =
    input.contentType?.trim() ||
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";

  await putObjectBytes({
    key: input.key,
    body: buf,
    contentType,
  });

  return { key: input.key, size: buf.length, contentType };
}
