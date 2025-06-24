import { AlignLeftIcon, DotIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import Image from "next/image";

import { formatBytes } from "@/utils/helpers";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { auth } from "@/auth";
import DownloadButton from "@/components/download-file-button";
import FileIcon from "@/components/file-icon";
import { getFileUrl } from "@/app/actions/files";

type Props = {
  params: Promise<{ fileKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fileKey } = await params;

  const [file] = await db
    .select({
      filename: files.filename,
      ownerId: files.ownerId,
      id: files.id,
    })
    .from(files)
    .where(eq(files.id, fileKey))
    .limit(1);

  if (!file) {
    return {
      title: "File not found",
    };
  }

  const downloadKey = file.ownerId
    ? `${file.ownerId}/${file.id}/${file.filename}`
    : `anonymous/${file.id}/${file.filename}`;

  const fileUrl = await getFileUrl(downloadKey);

  const isVideo = [".mp4", ".mov", ".webm"].some((ext) =>
    file.filename.toLowerCase().endsWith(ext),
  );

  const isImage = [".png", ".jpg", ".jpeg", ".gif"].some((ext) =>
    file.filename.toLowerCase().endsWith(ext),
  );

  const isAudio = [".mp3", ".wav", ".ogg", ".m4a"].some((ext) =>
    file.filename.toLowerCase().endsWith(ext),
  );

  if (isVideo) {
    return {
      title: file.filename,
      description: null,
      openGraph: {
        title: file.filename,
        type: "video.other",
        videos: [
          {
            url: fileUrl,
            width: 1280,
            height: 720,
            type: `video/${file.filename.split(".").pop()}`,
          },
        ],
      },
      twitter: {
        card: "player",
        title: file.filename,
        description: undefined,

        players: [
          {
            playerUrl: fileUrl,
            streamUrl: fileUrl,
            width: 1280,
            height: 720,
          },
        ],
      },
    };
  }

  if (isImage) {
    return {
      title: file.filename,
      description: null,
      openGraph: {
        title: file.filename,
        images: [
          {
            url: fileUrl,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: file.filename,
        description: undefined,

        images: [fileUrl],
      },
    };
  }

  if (isAudio) {
    return {
      title: file.filename,
      description: null,

      openGraph: {
        title: file.filename,
        audio: [
          {
            url: fileUrl,
            type: `audio/${file.filename.split(".").pop()}`,
          },
        ],
      },
      twitter: {
        card: "player",
        title: file.filename,

        description: "Click to play audio",
        players: [
          {
            playerUrl: fileUrl,
            streamUrl: fileUrl,
            width: 400,
            height: 100,
          },
        ],
      },
    };
  }

  return {
    title: file.filename,
  };
}

export default async function FileView({
  params,
}: {
  params: Promise<{ fileKey: string }>;
}) {
  const session = await auth();
  const { fileKey } = await params;

  const [file] = await db
    .select({
      filename: files.filename,
      uploadedAt: files.uploadedAt,
      size: files.size,
      ownerId: files.ownerId,
      id: files.id,
    })
    .from(files)
    .where(eq(files.id, fileKey))
    .limit(1);

  if (!file) {
    return notFound();
  }

  const [owner] = file.ownerId
    ? await db.select().from(users).where(eq(users.id, file.ownerId)).limit(1)
    : [];

  const downloadKey = file.ownerId
    ? `${file.ownerId}/${file.id}/${file.filename}`
    : `anonymous/${file.id}/${file.filename}`;

  const fileUrl = await getFileUrl(downloadKey);

  const isVideo = [".mp4", ".mov", ".webm"].some((ext) =>
    file.filename.toLowerCase().endsWith(ext),
  );

  const isImage = [".png", ".jpg", ".jpeg", ".gif"].some((ext) =>
    file.filename.toLowerCase().endsWith(ext),
  );

  const isAudio = [".mp3", ".wav", ".ogg", ".m4a"].some((ext) =>
    file.filename.toLowerCase().endsWith(ext),
  );

  return (
    <div
      suppressHydrationWarning
      className="h-[78vh] flex flex-col lg:justify-center items-center max-lg:mt-5 px-5"
    >
      <div className="max-w-[475px] w-full">
        <div className="mb-5">
          <p className="font-semibold">Download your file - {file.filename}</p>
          <p className="text-zinc-500">
            This file is securely hosted by Solven.
          </p>
        </div>
        <div className="w-full flex justify-between mt-5 mb-2 text-zinc-400 text-sm">
          <div className="flex gap-1 items-center">
            <AlignLeftIcon className="w-4 h-4" />
            <p>
              {owner
                ? `Uploaded by ${
                    owner.id == (session?.user?.id as string)
                      ? "me"
                      : owner.name
                  }.`
                : "Uploaded by anonymous user."}
            </p>
          </div>
          <p>
            Uploaded on{" "}
            {new Date(file.uploadedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </p>
        </div>
        <div className="border bg-default-100 rounded-xl">
          {isVideo && (
            <video controls className="w-full rounded-t-xl" src={fileUrl}>
              <track kind="captions" />
            </video>
          )}
          {isImage && (
            <Image
              alt={file.filename}
              className="w-full rounded-t-xl"
              height={600}
              src={fileUrl}
              width={800}
            />
          )}
          {isAudio && (
            <audio controls className="w-full rounded-t-xl p-4" src={fileUrl}>
              <track kind="captions" />
            </audio>
          )}
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-x-2 w-full overflow-hidden">
              {!isVideo && !isImage && !isAudio && (
                <div className="p-4 bg-default-200 rounded-lg w-fit m-3 mr-0">
                  <FileIcon fileName={file.filename} />
                </div>
              )}
              <div className="flex flex-col gap-y-1.5 p-4 min-w-[200px] md:min-w-[270px]">
                <div className="flex items-center gap-x-2 w-full">
                  <div className="flex-1 flex items-center min-w-0">
                    <span className="text-sm font-semibold truncate">
                      {file.filename}
                    </span>
                    <DotIcon className="w-4 h-4 shrink-0 text-zinc-400" />
                    <p className="text-zinc-400 text-sm whitespace-pre-line shrink-0">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DownloadButton fileKey={downloadKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
