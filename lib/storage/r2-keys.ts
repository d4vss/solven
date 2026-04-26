import { normalizeFilenameForObjectKey } from "@/lib/storage/filename-normalize";

export function userStoragePrefix(userId: string) {
  return `users/${userId}/`;
}

export function assertUserOwnsKey(key: string, userId: string) {
  const prefix = userStoragePrefix(userId);
  if (!key.startsWith(prefix)) {
    throw new Error("Object key is outside your storage prefix");
  }
}

export function buildObjectKey(userId: string, filename: string) {
  const base = normalizeFilenameForObjectKey(filename);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${userStoragePrefix(userId)}${id}-${base}`;
}
