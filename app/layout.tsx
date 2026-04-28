import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Header from "@/components/layout/header";
import { AuthSignInToast } from "@/components/auth/auth-sign-in-toast";
import { AppToaster } from "@/components/providers/app-toaster";
import { TooltipRootProvider } from "@/components/providers/tooltip-root-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Solven",
    template: "%s | Solven",
  },
  description:
    "Secure file storage and sharing with explorer-style organization and controlled downloads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Solven" />
      </head>
      <body className="antialiased dark min-h-screen flex flex-col">
        <TooltipRootProvider>
          <AppToaster />
          <AuthSignInToast />
          <Header />
          <main className="flex min-h-0 grow flex-col">{children}</main>
          <footer></footer>
        </TooltipRootProvider>
      </body>
    </html>
  );
}
