/**
 * Produces a single path segment safe for R2 object keys (letters, digits, . _ -).
 * The original display name is kept separately (e.g. `storage_entry.name`) for downloads.
 */
export function normalizeFilenameForObjectKey(filename: string): string {
  let base = filename.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  const segments = base.split("/").filter(Boolean);
  base = segments[segments.length - 1] ?? "";
  if (!base || base === "." || base === "..") {
    throw new Error("Invalid filename");
  }
  // Sanitize traversal-like sequences instead of rejecting the upload.
  base = base.replace(/\.\.+/g, "_");

  let s = base
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/\.\.+/g, ".")
    .replace(/_+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "");

  if (!s) s = "file";
  return s.slice(0, 200);
}
