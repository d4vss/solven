"use client";

import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";

interface DownloadButtonProps {
  fileId: string;
  className?: string;
}

export function DownloadButton({ fileId, className }: DownloadButtonProps) {
  const router = useRouter();

  const handleDownload = async () => {
    try {
      window.open(`/file/${fileId}`, "_blank");
      router.refresh();
    } catch {
      addToast({
        color: "danger",
        description: "Failed to download. Please try again.",
      });
    }
  };

  return (
    <button
      className={`p-2 text-default-600 hover:text-default-900 transition-colors ${className}`}
      onClick={handleDownload}
    >
      Download
    </button>
  );
}
