import { notFound } from "next/navigation";
import { getShareLinkByToken } from "@/lib/account/share-link-repo";
import { SharedFilePageClient } from "@/components/share/shared-file-page-client";

type RouteCtx = { params: Promise<{ token: string }> };

export default async function SharedFilePage({ params }: RouteCtx) {
  const { token } = await params;
  const link = await getShareLinkByToken(token);
  if (!link) notFound();
  return <SharedFilePageClient token={token} />;
}
