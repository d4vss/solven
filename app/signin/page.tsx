import { redirect } from "next/navigation";

export default async function LegacySignInRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const url = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
  redirect(url);
}
