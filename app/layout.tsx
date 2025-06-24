import "@/app/globals.css";
import { Metadata } from "next";
import clsx from "clsx";
import { Inter } from "next/font/google";
import { ToastProvider } from "@heroui/toast";

import { auth } from "@/auth";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://solven.d4vss.net";

export const metadata: Metadata = {
  title: "Solven",
  description: "Your reliable file sharing solution.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Solven",
    description: "Your reliable file sharing solution.",
    url: siteUrl,
    siteName: "Solven",
    images: [
      {
        url: "/og-image.png",
        width: 100,
        height: 100,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "player",
    title: "Solven",
    description: "Your reliable file sharing solution.",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html suppressHydrationWarning className="scroll-smooth" lang="en">
      <head>
        <meta content="Solven" name="apple-mobile-web-app-title" />
        {process.env.NEXT_PUBLIC_MONETAG_ID && (
          <meta content={process.env.NEXT_PUBLIC_MONETAG_ID} name="monetag" />
        )}
      </head>
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased flex flex-col",
          inter.className,
        )}
      >
        <ToastProvider
          maxVisibleToasts={3}
          placement="bottom-right"
          toastOffset={10}
          toastProps={{
            classNames: {
              base: "rounded-lg p-4 shadow-lg",
              description: "text-foreground",
              icon: "hidden",
            },
            variant: "bordered",
            size: "lg",
          }}
        />
        <Header session={session} />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
