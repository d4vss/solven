"use client";

import { Button } from "@heroui/button";
import { MdUpload } from "react-icons/md";
import { AnimatePresence, motion } from "framer-motion";
import { Link2Icon } from "lucide-react";
import { Progress } from "@heroui/progress";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

import FileIcon from "../file-icon";

import FilesBreadcrumbs, {
  type BreadcrumbItemType,
} from "./dashboard-breadcrumbs";

import { createNewEmptyFolder } from "@/app/actions/folders";
import { copyTextToClipboard, formatBytes } from "@/utils/helpers";
import { useUploader } from "@/utils/uploader";

export default function UploadDashboard({
  breadcrumbsItems,
  location,
}: {
  breadcrumbsItems: BreadcrumbItemType[];
  location: string;
}) {
  const { files, onFileChange, onButtonClick, inputRef } =
    useUploader(location);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const router = useRouter();

  const handleCreateFolder = async () => {
    if (!folderName) {
      addToast({
        color: "danger",
        description: "Folder name cannot be empty.",
      });

      return;
    }

    const res = await createNewEmptyFolder(folderName);

    if (res.success) {
      addToast({
        description: `Folder "${folderName}" created successfully.`,
      });
      setIsModalOpen(false);
      setFolderName("");
      router.refresh();
    } else {
      addToast({
        color: "danger",
        description:
          res.error?.message || "An error occurred creating the folder.",
      });
    }
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (typeof seconds !== "number" || !isFinite(seconds) || seconds <= 0) {
      return "";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  };

  return (
    <div>
      <div className="px-4 max-md:px-0 flex items-center justify-between border-b border-default-200 py-4 bg-default-50">
        <FilesBreadcrumbs items={breadcrumbsItems} />
        <div className="flex items-center gap-3">
          {breadcrumbsItems.length == 1 ? (
            <Button
              aria-label="New folder"
              className="rounded-sm"
              title="New folder"
              variant="bordered"
              onPress={() => setIsModalOpen(true)}
            >
              New folder
            </Button>
          ) : (
            <Button
              aria-label="Copy folder URL"
              className="rounded-sm"
              title="Copy folder URL"
              variant="faded"
              onPress={async () =>
                await copyTextToClipboard(
                  `${window.location.origin}/folder${location}`,
                )
              }
            >
              <Link2Icon className="w-5 h-5" />
              Copy folder URL
            </Button>
          )}
          <Button
            aria-label="Upload files"
            className="rounded-sm"
            title="Upload files"
            variant="faded"
            onPress={onButtonClick}
          >
            <MdUpload className="w-5 h-5" />
            Upload
          </Button>
          <input
            ref={inputRef}
            multiple
            className="hidden"
            type="file"
            onChange={async (e) => {
              await onFileChange(e);
            }}
          />
        </div>
      </div>
      <div
        className={`mt-4 ${files.length != 0 && "border"} rounded-lg border-default-200 bg-background`}
      >
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={index}
              animate={{ opacity: 1, y: 0 }}
              className="w-full py-5 px-7 max-md:px-3 flex gap-x-4 items-center justify-between group hover:bg-default-400/20 transition-all relative"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-x-4 overflow-hidden flex-1">
                <FileIcon fileName={file.file.name} />
                <div className="text-sm w-full">
                  <div className="flex items-center justify-between gap-x-2">
                    <span
                      className="truncate w-40 md:w-72"
                      title={file.file.name}
                    >
                      {file.file.name}
                    </span>
                    {file.status === "uploading" ? (
                      <div className="flex items-center gap-x-2 w-96">
                        <Progress
                          aria-label="Uploading..."
                          className="w-full"
                          size="md"
                          value={file.uploadProgress}
                        />
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {Math.round(file.uploadProgress)}%
                        </span>
                        <span className="text-xs text-gray-500 w-44 text-right">
                          {formatTimeRemaining(file.timeRemaining)} remaining
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 w-40 text-right">
                        {formatBytes(file.file.size || 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent>
          <ModalHeader>Create new folder</ModalHeader>
          <ModalBody>
            <Input
              label="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              className="rounded-md"
              variant="faded"
              onPress={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md"
              color="primary"
              onPress={handleCreateFolder}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
