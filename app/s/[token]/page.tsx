import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShareLinkByToken } from "@/lib/account/share-link-repo";
import { getEntryById } from "@/lib/account/storage-entry-repo";
import { SharedFilePageClient } from "@/components/share/shared-file-page-client";

type RouteCtx = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: RouteCtx): Promise<Metadata> {
  const { token } = await params;
  const link = await getShareLinkByToken(token);
  if (!link) {
    return {
      title: "Shared file",
      description: "Open a secure shared file or folder link.",
    };
  }
  const entry = await getEntryById(link.entryId);
  const kindLabel = entry?.kind === "folder" ? "folder" : "file";
  const itemName = entry?.name?.trim() || `Shared ${kindLabel}`;
  return {
    title: `${itemName} - Shared ${kindLabel}`,
    description: `Download shared ${kindLabel}: ${itemName}.`,
  };
}

export default async function SharedFilePage({ params }: RouteCtx) {
  const { token } = await params;
  const link = await getShareLinkByToken(token);
  if (!link) notFound();
  return <SharedFilePageClient token={token} />;
}
