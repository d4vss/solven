import { eq, isNull, and } from "drizzle-orm";
import { FaFolder } from "react-icons/fa";
import { GoHomeFill } from "react-icons/go";
import { MdBlockFlipped } from "react-icons/md";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { db } from "@/db";
import { files, folders } from "@/db/schema";
import { DashboardItem } from "@/components/dashboard/dashboard-item";
import Pagination from "@/components/dashboard/pagination";
import { SelectionProvider } from "@/components/dashboard/selection-context";
import BulkActions from "@/components/dashboard/bulk-actions";
import UploadDashboard from "@/components/dashboard/dashboard-upload";

const ITEMS_PER_PAGE = 10;

interface FileItem {
  id: string;
  name: string;
  type: "file";
  size: number;
  downloadCount: number;
  createdAt: Date;
}

interface FolderItem {
  id: string;
  name: string;
  type: "folder";
  createdAt: Date;
}

type DashboardItemType = FileItem | FolderItem;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ location: string; page?: string }>;
}) {
  const session = await auth();
  const { location = "/", page = "1" } = await searchParams;
  const currentPage = parseInt(page as string, 10);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  if (!session?.user?.id) {
    return null;
  }

  const rootFiles = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.ownerId, session.user.id.toString()),
        isNull(files.folderId),
      ),
    );

  const rootFolders = await db
    .select()
    .from(folders)
    .where(eq(folders.ownerId, session.user.id.toString()));

  const currentLocationName = location.split("/").pop();

  const folderName = rootFolders.find(
    (folder) => folder.id === currentLocationName,
  )?.name;

  const locationFiles = currentLocationName
    ? await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.ownerId, session.user.id.toString()),
            eq(files.folderId, currentLocationName),
          ),
        )
    : [];

  const rootItems: DashboardItemType[] = [
    ...rootFiles.map(
      (file: typeof files.$inferSelect): FileItem => ({
        id: file.id,
        name: file.filename,
        type: "file",
        size: file.size,
        downloadCount: file.downloadCount,
        createdAt: new Date(file.uploadedAt),
      }),
    ),
    ...rootFolders.map(
      (folder): FolderItem => ({
        id: folder.id,
        name: folder.name,
        type: "folder",
        createdAt: new Date(folder.createdAt),
      }),
    ),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const locationItems: DashboardItemType[] = locationFiles.map(
    (file: typeof files.$inferSelect): FileItem => ({
      id: file.id,
      name: file.filename,
      type: "file",
      size: file.size,
      downloadCount: file.downloadCount,
      createdAt: new Date(file.uploadedAt),
    }),
  );

  const allItems = location !== "/" ? locationItems : rootItems;

  const displayedItems = allItems.slice(offset, offset + ITEMS_PER_PAGE);

  const totalItems = allItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const breadcrumbsItems = [
    {
      href: "/dashboard?location=/",
      icon: <GoHomeFill size={16} />,
      name: "Home",
    },
    ...(location !== "/" && folderName && currentLocationName
      ? [
          {
            href: `/dashboard?location=/${currentLocationName}`,
            icon: <FaFolder size={16} />,
            name: folderName,
          },
        ]
      : []),
  ];

  return (
    <SelectionProvider>
      <SessionProvider session={session}>
        <div className="bg-background">
          <UploadDashboard
            breadcrumbsItems={breadcrumbsItems}
            location={location}
          />
          <div className="py-4">
            <BulkActions />
            <div className="mt-4 border rounded-lg border-default-200 bg-background">
              {displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-dashed border-2 border-default-200 rounded-lg bg-default-50/50 m-4">
                  <MdBlockFlipped className="w-12 h-12 text-default-400" />
                  <p className="mt-4 text-sm text-default-600">
                    No files or folders found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-default-200">
                  {displayedItems.map((item) => (
                    <DashboardItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  baseUrl="/dashboard"
                  currentPage={currentPage}
                  searchParams={{ location }}
                  totalPages={totalPages}
                />
              </div>
            )}
          </div>
        </div>
      </SessionProvider>
    </SelectionProvider>
  );
}
