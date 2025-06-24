import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET
) {
  throw new Error("Missing R2 environment variables");
}

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

const S3 = getR2Client();

export async function uploadFile(file: Buffer, key: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: file,
  });
  try {
    const response = await S3.send(command);
    return response;
  } catch (error) {
    throw error;
  }
}

export async function getSignedUrlForUpload(
  key: string,
  contentType: string,
  fileName: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    Metadata: {
      "x-amz-meta-filename": fileName,
    },
  });
  try {
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    throw error;
  }
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  try {
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    throw error;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  try {
    await S3.send(command);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFileNoCheck(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  try {
    const response = await S3.send(command);
    return response;
  } catch {
    return false;
  }
}

export async function checkFileExistsR2(key: string): Promise<boolean> {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  try {
    await S3.send(command);
    return true;
  } catch {
    return false;
  }
}
