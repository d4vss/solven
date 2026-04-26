import { S3Client } from "@aws-sdk/client-s3";
import { getR2Env, r2S3Endpoint } from "@/lib/storage/r2-env";

let cached: S3Client | null = null;

export function getR2S3Client(): S3Client {
  if (cached) return cached;
  const env = getR2Env();
  cached = new S3Client({
    region: "auto",
    endpoint: r2S3Endpoint(env.accountId),
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  return cached;
}
