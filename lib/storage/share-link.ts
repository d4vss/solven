import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

export function hashSharePassword(raw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(raw, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifySharePassword(raw: string, encoded: string): boolean {
  const [saltHex, hashHex] = encoded.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(raw, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
