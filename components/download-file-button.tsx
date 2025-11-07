"use client";

import { useState } from "react";
import { LiaDownloadSolid } from "react-icons/lia";

import { getFileUrl } from "@/app/actions/files";
import CircularSpinner from "./spinner";
import { CheckIcon } from "lucide-react";

export default function DownloadButton({ fileKey }: { fileKey: string }) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  async function downloadImage(fileName: string) {
    setIsDownloaded(true);
    const url = await getFileUrl(fileKey);

    const response = await fetch(url, { mode: "cors" });

    const contentLength = response.headers.get("Content-Length");
    if (!contentLength) {
      console.warn(
        "Content-Length header is missing — cannot track progress accurately.",
      );
    }

    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;

          const progress = total ? Math.round((loaded / total) * 100) : null;
          console.log(`Downloaded: ${progress ?? "?"}%`);

          setProgress(progress ?? 0);
        }
      }
    }

    const combined = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
      const uint8 = new Uint8Array(chunk);
      combined.set(uint8, position);
      position += uint8.length;
    }
    const blob = new Blob([combined]);

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
      className={`shrink-0 border-l-2 transition-all h-full rounded-none hover:bg-default-200 rounded-r-xl cursor-pointer border-default-200 aspect-square p-7 ${isDownloaded && "opacity-disabled pointer-events-none"}`}
      onClick={() =>
        downloadImage(fileKey.split("/")[fileKey.split("/").length - 1])
      }
    >
      {isDownloaded && progress < 100 ? (
        <div className="text-center">
          <CircularSpinner
            progress={progress}
            size={20}
            color="black"
            strokeWidth={2}
            trackColor="grey"
          />
        </div>
      ) : isDownloaded && progress === 100 ? (
        <CheckIcon strokeWidth={4} className="w-5 h-5 text-green-500" />
      ) : (
        <LiaDownloadSolid className="w-5 h-5" />
      )}
    </button>
  );
}
