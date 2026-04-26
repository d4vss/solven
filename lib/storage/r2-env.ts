function required(name: string, value: string | undefined): string {
  if (value == null || value === "") {
    throw new Error(`Missing env ${name} for Cloudflare R2`);
  }
  return value;
}

export type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Optional public bucket URL for browser reads (R2 custom domain or r2.dev). */
  publicBaseUrl: string | null;
};

export function getR2Env(): R2Env {
  return {
    accountId: required("R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID),
    accessKeyId: required("R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY),
    bucket: required("R2_BUCKET_NAME", process.env.R2_BUCKET_NAME),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? null,
  };
}

export function r2S3Endpoint(accountId: string) {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}
