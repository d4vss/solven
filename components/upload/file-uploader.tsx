"use client";

import type { FileObject } from "@/types/upload";

import { useRef, useState } from "react";
import { addToast } from "@heroui/toast";

import { copyTextToClipboard } from "@/utils/helpers";

export function useUploader(config: {
  onCreateFolder?: (folderName: string) => Promise<void>;
  onDeleteFolder?: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [folderName, setFolderName] = useState("");
  const [folderUrl, setFolderUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFileObjects: FileObject[] = selectedFiles.map((file) => ({
      file,
      fileKey: crypto.randomUUID(),
      fileUrl: "",
      uploadProgress: 0,
      status: "idle",
    }));

    setFiles((prev) => [...prev, ...newFileObjects]);
  };

  const uploadedFilesCount = files.filter(
    (f) => f.status === "uploaded",
  ).length;
  const uploadDone = files.length > 0 && uploadedFilesCount === files.length;

  const copyAllUrls = () => {
    const uploaded = files.filter((f) => f.status === "uploaded");

    if (uploaded.length !== files.length) return;

    const urls = uploaded
      .map((f) => window.location.origin + f.fileUrl)
      .join("\n");

    copyTextToClipboard(urls);
    addToast({
      variant: "flat",
      color: "default",
      description: "All share URLs copied to clipboard.",
    });
  };

  const copyFolderUrl = () => {
    if (!folderUrl) return;
    copyTextToClipboard(folderUrl);
    addToast({ description: "Folder URL copied to clipboard." });
  };

  const createFolder = async () => {
    if (!folderName.trim()) {
      addToast({ color: "danger", description: "Please enter a folder name." });

      return;
    }
    await config.onCreateFolder?.(folderName);
    setFolderName("");
    setIsModalOpen(false);
  };

  const deleteFolder = async () => {
    await config.onDeleteFolder?.();
  };

  const resetUploader = () => {
    setFiles([]);
    setFolderUrl(null);
    setFolderName("");
    setIsModalOpen(false);
  };

  return {
    inputRef,
    files,
    setFiles,
    onFileChange,
    onButtonClick: triggerFileInput,
    uploadedFilesCount,
    uploadDone,
    folderName,
    setFolderName,
    folderUrl,
    setFolderUrl,
    isModalOpen,
    setIsModalOpen,
    copyAllUrls,
    copyFolderUrl,
    createFolder,
    deleteFolder,
    resetUploader,
  };
}
