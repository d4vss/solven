"use client";

import { useState } from "react";
import { LiaDownloadSolid } from "react-icons/lia";

import { getFileUrl } from "@/app/actions/files";

export default function DownloadButton({ fileKey }: { fileKey: string }) {
  const [isDownloaded, setIsDownloaded] = useState(false);

  async function downloadImage(fileName: string) {
    setIsDownloaded(true);
    const url = await getFileUrl(fileKey);
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <button
      className={`shrink-0 border-l-2 p-7 transition-all h-full rounded-none hover:bg-default-200 rounded-r-xl cursor-pointer border-default-200 aspect-square ${isDownloaded && "opacity-disabled pointer-events-none"}`}
      onClick={() =>
        downloadImage(fileKey.split("/")[fileKey.split("/").length - 1])
      }
    >
      <LiaDownloadSolid className="w-5 h-5" />
    </button>
  );
}
