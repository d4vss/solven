import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  description: "Your files, plan, and account settings.",
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-8">
      {children}
    </div>
  );
}
