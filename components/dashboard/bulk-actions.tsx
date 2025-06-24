"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdDelete } from "react-icons/md";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";

import { useSelection } from "./selection-context";
import LoadingState from "./loading-state";

import { deleteFolder } from "@/app/actions/folders";
import { deleteFile } from "@/app/actions/files";

export default function BulkActions() {
  const router = useRouter();
  const { selectedItems, clearSelection } = useSelection();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      setIsLoading(true);
      setShowLoading(true);

      // Split items into files and folders
      const items = Array.from(selectedItems);
      const files = items.filter((id) => id.startsWith("file_"));
      const folders = items.filter((id) => id.startsWith("folder_"));

      // Delete files
      for (const fileId of files) {
        await deleteFile(fileId);
      }

      // Delete folders
      for (const folderId of folders) {
        await deleteFolder(folderId);
      }

      addToast({
        color: "danger",
        description: `Deleted ${selectedItems.size} items.`,
      });

      clearSelection();
      router.refresh();
    } catch {
      addToast({
        color: "danger",
        description: "Failed to delete items. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setShowLoading(false);
    }
  };

  if (selectedItems.size === 0) return null;

  return (
    <>
      {showLoading && <LoadingState />}
      <div className="bg-default-50 border border-default-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-default-700 font-medium">
            {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            color="danger"
            isLoading={isLoading}
            startContent={<MdDelete className="w-4 h-4" />}
            variant="flat"
            onPress={handleBulkDelete}
          >
            Delete Selected
          </Button>
          <Button variant="light" onPress={clearSelection}>
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}
