/**
 * RFC 6266-style attachment header for S3/R2 GetObject overrides on presigned URLs.
 */
export function attachmentContentDisposition(downloadName: string): string {
  const trimmed = downloadName.trim().slice(0, 500);
  const encoded = encodeURIComponent(trimmed);
  const ascii = trimmed
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/\\/g, "_")
    .replace(/"/g, "'")
    .slice(0, 200);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
