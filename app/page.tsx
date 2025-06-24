import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { UploadPage } from "@/components/upload/upload-page";

export default async function Home() {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <UploadPage />
    </SessionProvider>
  );
}
