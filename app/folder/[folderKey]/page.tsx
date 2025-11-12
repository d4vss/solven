import { Link } from "@heroui/link";
import { AlignLeftIcon, ArrowUpRightIcon, DotIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { formatBytes } from "@/utils/helpers";
import { db } from "@/db";
import { folders, files as filesTable, users } from "@/db/schema";
import { auth } from "@/auth";
import FileIcon from "@/components/file-icon";
import { fileExists } from "@/utils/r2";

export default async function FolderView({
  params,
}: {
  params: Promise<{ folderKey: string }>;
}) {
  const session = await auth();
  const { folderKey } = await params;

  const [folder] = await db
    .select({
      ownerId: folders.ownerId,
      name: folders.name,
    })
    .from(folders)
    .where(eq(folders.id, folderKey))
    .limit(1);

  if (!folder) {
    return notFound();
  }

  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, folder.ownerId as string))
    .limit(1);

  const files = await db
    .select({
      name: filesTable.filename,
      uploadedAt: filesTable.uploadedAt,
      size: filesTable.size,
      id: filesTable.id,
    })
    .from(filesTable)
    .where(eq(filesTable.folderId, folderKey));

  let filteredFiles = [];

  for (const file of files) {
    const exists = await fileExists(
      `${folder.ownerId}/${file.id}/${file.name}`,
    );
    if (exists) {
      filteredFiles.push(file);
    } else {
      const folder = await db
        .select({ fileKeys: folders.fileKeys })
        .from(folders)
        .where(eq(folders.id, folderKey))
        .limit(1)
        .then((rows) => rows[0]);

      if (!folder) return notFound();

      const updatedFileKeys = folder.fileKeys.filter(
        (key: string) => key !== file.id,
      );

      await db.delete(filesTable).where(eq(filesTable.id, file.id));

      if (updatedFileKeys.length === 0) {
        await db.delete(folders).where(eq(folders.id, folderKey));
        return notFound();
      }

      await db
        .update(folders)
        .set({ fileKeys: updatedFileKeys })
        .where(eq(folders.id, folderKey));
    }
  }

  if (filteredFiles.length == 0) {
    return (
      <div className="h-[78vh] flex flex-col items-center justify-center px-2 text-center">
        <h2 className="uppercase text-3xl font-bold">Folder Is Empty</h2>
        <p className="text-gray-600 max-w-sm">
          There are no files in this folder. Upload some files to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[78vh] flex flex-col lg:justify-center items-center max-lg:mt-5 px-5">
      <div className="max-w-[475px] w-full">
        <div className="mb-5">
          <p className="font-semibold">Download your folder - {folder.name}</p>
          <p className="text-zinc-500">
            This folder is securely hosted by Solven.
          </p>
        </div>
        <div className="w-full flex justify-between mt-5 mb-2 text-zinc-400 text-sm">
          <div className="flex gap-1 items-center">
            <AlignLeftIcon className="w-4 h-4" />
            <p>
              {owner
                ? `Uploaded by ${owner.id == (session?.user?.id as string) ? "me" : owner.name}.`
                : null}
            </p>
          </div>
          <p>
            {files.length} file{files.length != 1 && "s"}
          </p>
        </div>
        <div className="flex flex-col gap-y-2 pb-4">
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-5 from-transparent to-background bg-gradient-to-t transition-all duration-300" />

            <div className="flex flex-col gap-y-2 max-h-72 md:max-h-96 lg:max-h-[510px] overflow-scroll py-5 px-2">
              {filteredFiles.reverse().map((file, idx) => (
                <div
                  key={idx}
                  className="border bg-default-100 rounded-xl flex items-center justify-between gap-x-2"
                >
                  <div className="flex items-center gap-x-2 w-full overflow-hidden">
                    <div className="p-4 bg-default-200 rounded-lg w-fit m-3 mr-0">
                      <FileIcon fileName={file.name} />
                    </div>
                    <div className="flex flex-col gap-y-1.5 px-2 min-w-[200px] md:min-w-[270px]">
                      <div className="flex items-center gap-x-2 w-full">
                        <div className="flex-1 flex items-center min-w-0">
                          <span className="text-sm font-semibold truncate">
                            {file.name}
                          </span>
                          <DotIcon className="w-4 h-4 shrink-0 text-zinc-400" />
                          <p className="text-zinc-400 text-sm whitespace-pre-line shrink-0">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <Link
                    className={
                      "shrink-0 border-l-2 p-7 transition-all h-full rounded-r-xl hover:bg-default-200 cursor-pointer border-default-200"
                    }
                    color="foreground"
                    href={`/file/${file.id}`}
                    size="sm"
                    target="_blank"
                  >
                    <ArrowUpRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-5 from-transparent to-background bg-gradient-to-b transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
