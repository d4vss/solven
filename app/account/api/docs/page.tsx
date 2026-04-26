import type { Metadata } from "next";
import { headers } from "next/headers";
import { ApiRemoteUploadDocs } from "@/components/account/api-remote-upload-docs";

export const metadata: Metadata = {
  title: "Remote upload API",
  description: "Authenticate with API keys, pull remote URLs into storage, and register files.",
};

function resolveDocsBaseUrl(h: Headers): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

export default async function RemoteUploadApiDocsPage() {
  const baseUrl = resolveDocsBaseUrl(await headers());
  return <ApiRemoteUploadDocs baseUrl={baseUrl} />;
}
