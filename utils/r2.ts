import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface FileObject {
  Key?: string;
  LastModified?: Date;
  ETag?: string;
  Size?: number;
  StorageClass?: string;
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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
    const signedUrl = await getSignedUrl(S3, command, {
      expiresIn: 3600,
    });

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
