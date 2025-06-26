"use client";

import { useState } from "react";
import { FaFile, FaFolder } from "react-icons/fa";
import { addToast } from "@heroui/toast";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  Link2Icon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import Link from "next/link";
import { MdDownload } from "react-icons/md";

import LoadingState from "./loading-state";

import { formatBytes } from "@/utils/helpers";
import { deleteFile } from "@/app/actions/files";
import { deleteFolder } from "@/app/actions/folders";

interface DashboardItemProps {
  item: {
    id: string;
    name: string;
    type: "file" | "folder";
    size?: number;
    downloadCount?: number;
    createdAt: Date;
  };
}

export function DashboardItem({ item }: DashboardItemProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [clicked, setClicked] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/${item.type}/${item.id}`,
    );
    addToast({
      classNames: {
        base: "rounded-md bottom-5 right-3",
        description: "text-foreground",
        icon: "hidden",
      },
      variant: "flat",
      color: "default",
      description: "Share URL copied to clipboard.",
    });

    setClicked(true);
    setTimeout(() => {
      setClicked(false);
    }, 2500);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setShowLoading(true);
    try {
      const deleteFn = item.type === "folder" ? deleteFolder : deleteFile;
      const response = await deleteFn(item.id);
      if (response.success == false) {
        addToast({
          classNames: {
            base: "rounded-md bottom-5 right-3",
            description: "text-foreground",
            icon: "hidden",
          },
          variant: "flat",
          color: "danger",
          title: response.message,
        });

        return;
      }
      addToast({
        color: "danger",
        description: `${item.type == "file" ? `File ${item.name}` : `${item.name}`} deleted.`,
      });
      router.refresh();
    } finally {
      setIsLoading(false);
      setShowLoading(false);
    }
  };

  return (
    <div
      className={`w-full py-5 px-7 max-md:px-3 flex gap-x-4 items-center justify-between group hover:bg-default-400 hover:!text-white transition-all relative ${
        isLoading && "pointer-events-none opacity-disabled"
      }`}
    >
      <div className="flex items-center gap-x-4 overflow-hidden">
        {item.type === "file" ? (
          <FaFile className="w-6 h-6 flex-shrink-0 group-hover:text-white" />
        ) : (
          <FaFolder className="w-6 h-6 flex-shrink-0 group-hover:text-white" />
        )}
        <div className="text-sm">
          <div className="flex items-center gap-x-2">
            <Link
              className={`truncate max-w-[175px] min-[500px]:max-w-xs md:max-w-xl group-hover:text-white hover:underline ${
                item.type == "file" && "pointer-events-none"
              }`}
              href={`/dashboard?location=/${
                item.type == "file" ? item.id : item.id
              }`}
            >
              {item.name}
            </Link>
            {item.type == "file" && (
              <span className="text-xs text-gray-500 group-hover:text-white group-hover:text-opacity-70 lg:ml-2 max-md:hidden">
                {item.downloadCount} download
                {item.downloadCount != 1 && "s"}, {formatBytes(item.size || 0)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 group-hover:text-white group-hover:text-opacity-70 flex items-center gap-x-2">
        <Button isIconOnly size="sm" variant="light" onPress={handleCopy}>
          {clicked ? (
            <CheckIcon className="w-3 h-3 group-hover:text-white" />
          ) : (
            <Link2Icon className="w-3 h-3 group-hover:text-white" />
          )}
        </Button>
        <span className="max-lg:hidden w-36 text-left">
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(item.createdAt))}
        </span>
        <Dropdown className="!bg-background">
          <DropdownTrigger>
            <Button isIconOnly size="sm" variant="light">
              <EllipsisVerticalIcon className="w-4 h-4 group-hover:text-white" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Static Actions"
            disabledKeys={["lock"]}
            variant="faded"
          >
            {item.type == "file" ? (
              <DropdownItem
                key="download"
                startContent={<MdDownload className="w-4 h-4" />}
                onPress={() => window.open(`/file/${item.id}`, "_blank")}
              >
                Download file
              </DropdownItem>
            ) : (
              <DropdownItem
                key="view-folder"
                startContent={<EyeIcon className="w-4 h-4" />}
                onPress={() => router.push(`/dashboard?location=/${item.id}`)}
              >
                View folder
              </DropdownItem>
            )}
            <DropdownItem
              key="delete"
              className="text-red-500"
              color="danger"
              startContent={<Trash2Icon className="w-4 h-4" />}
              variant="faded"
              onPress={handleDelete}
            >
              Delete {item.type}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      {showLoading && (
        <LoadingState message={`Deleting ${item.type} "${item.name}"...`} />
      )}
    </div>
  );
}
