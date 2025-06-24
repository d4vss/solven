"use client";

import { useState, useRef } from "react";
import { addToast } from "@heroui/toast";
import { useSession } from "next-auth/react";

import { FileObject } from "@/types/upload";
import { createFolder, softDeleteFolder } from "@/app/actions/folders";
import {
  getSignedUrlForUpload,
  confirmUploadCompletion,
} from "@/app/actions/upload";

class AbortError extends Error {
  constructor(message = "Upload cancelled") {
    super(message);
    this.name = "AbortError";
  }
}

export function useUploader(location: string) {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<FileObject[]>([]);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);
  const [disabledKeys, setDisabledKeys] = useState<string[]>([
    "copy-folder-url",
    "delete-folder",
  ]);
  const [folderName, setFolderName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleButtonClick = () => inputRef.current?.click();

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles: FileObject[] = Array.from(e.target.files).map((file) => ({
      file,
      uploadProgress: 0,
      fileUrl: "",
      fileKey: "",
      status: "idle",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    await uploadFiles(newFiles, files.length);
  };

  const uploadRawFiles = async (rawFiles: File[]) => {
    const newFiles: FileObject[] = rawFiles.map((file) => ({
      file,
      uploadProgress: 0,
      fileUrl: "",
      fileKey: "",
      status: "idle",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    await uploadFiles(newFiles, files.length);
  };

  const uploadFiles = async (fileList: FileObject[], filesUntilNow: number) => {
    try {
      const ownerId = session?.user?.id ?? null;

      abortControllerRef.current = new AbortController();

      disableDropdownItem("create-folder");
      disableDropdownItem("copy-folder-url");
      disableDropdownItem("copy-all-urls");
      disableDropdownItem("delete-folder");

      await Promise.all(
        fileList.map(async (fileObject, idx) => {
          const response = await getSignedUrlForUpload(
            fileObject.file.name,
            fileObject.file.size,
            fileObject.file.type,
          );

          if (!response.success || !response.content) {
            throw new Error(response.error?.message || "Unknown error");
          }

          const { signedUrl, fileId } = response.content.variables;

          await uploadFileWithProgress(
            ownerId as string,
            fileId,
            fileObject,
            signedUrl,
            abortControllerRef.current!.signal,
            filesUntilNow + idx,
          );

          setFiles((prev) => {
            const newFiles = [...prev];

            newFiles[filesUntilNow + idx] = {
              ...newFiles[filesUntilNow + idx],
              fileUrl: `/file/${fileId}`,
              fileKey: fileId,
              status: "uploaded",
            };

            return newFiles;
          });
        }),
      );

      if (!folderUrl) {
        enableDropdownItem("create-folder");
      } else {
        enableDropdownItem("copy-folder-url");
        enableDropdownItem("delete-folder");
      }
      enableDropdownItem("copy-all-urls");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        addToast({ description: "Upload cancelled." });
      } else {
        addToast({
          color: "danger",
          description: "There was an error with uploading the file(s).",
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const uploadFileWithProgress = (
    ownerId: string,
    fileId: string,
    fileObject: FileObject,
    signedUrl: string,
    signal: AbortSignal,
    index: number,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastTimeUpdate = startTime;

      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", fileObject.file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const now = Date.now();
          const progress = (event.loaded / event.total) * 100;
          let timeRemaining: number | undefined;

          if (now - lastTimeUpdate > 1000) {
            lastTimeUpdate = now;
            const elapsedTime = now - startTime;
            const uploadSpeed = event.loaded / (elapsedTime / 1000);
            const bytesRemaining = event.total - event.loaded;

            timeRemaining = bytesRemaining / uploadSpeed;
          }

          setFiles((prev) => {
            const updated = [...prev];
            const currentFile = updated[index];

            if (!currentFile) {
              return prev;
            }

            updated[index] = {
              ...currentFile,
              uploadProgress: progress,
              timeRemaining:
                timeRemaining !== undefined
                  ? timeRemaining
                  : currentFile.timeRemaining,
              status: "uploading",
            };

            return updated;
          });
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const response = await confirmUploadCompletion(
              fileId,
              ownerId,
              fileObject.file.name,
              fileObject.file.size,
              location === "/" ? undefined : location.split("/").pop(),
            );

            if (!response.success) {
              throw new Error(
                response.error?.message || "Failed to confirm upload",
              );
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.ontimeout = () => reject(new Error("Upload timed out"));
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new AbortError());
      });

      xhr.send(fileObject.file);
    });
  };

  const handleCreateFolder = async (name: string) => {
    const response = await createFolder(
      name,
      files.map((f) => f.fileKey),
    );

    if (!response.success) {
      return addToast({
        color: "danger",
        description: response.error?.message || "Failed to create folder",
      });
    }

    setFolderUrl(
      response.folderPath
        ? `${window.location.origin}${response.folderPath}`
        : null,
    );

    enableDropdownItem("copy-folder-url");
    enableDropdownItem("delete-folder");
    disableDropdownItem("create-folder");

    addToast({ description: "Folder created successfully." });
  };

  const handleDeleteFolder = async () => {
    if (!folderUrl) return;

    const folderId = folderUrl.split("/").pop();

    if (!folderId) {
      return addToast({
        color: "danger",
        description: "Invalid folder URL",
      });
    }

    const response = await softDeleteFolder(folderId);

    if (!response.success) {
      return addToast({
        color: "danger",
        description: response.error?.message || "Failed to delete folder",
      });
    }

    setFolderUrl(null);
    enableDropdownItem("create-folder");
    disableDropdownItem("copy-folder-url");
    disableDropdownItem("delete-folder");

    addToast({ description: "Folder deleted successfully." });
  };

  const enableDropdownItem = (key: string) => {
    setDisabledKeys((prev) => prev.filter((k) => k !== key));
  };

  const disableDropdownItem = (key: string) => {
    setDisabledKeys((prev) => [...prev, key]);
  };

  const isEnabled = (key: string) => !disabledKeys.includes(key);

  const uploadedFilesCount = files.filter(
    (f) => f.status === "uploaded",
  ).length;
  const uploadDone = files.length > 0 && uploadedFilesCount === files.length;

  return {
    files,
    inputRef,
    folderUrl,
    folderName,
    setFolderName,
    isModalOpen,
    setIsModalOpen,
    disabledKeys,
    onFileChange: handleFileChange,
    onButtonClick: handleButtonClick,
    removeFile,
    cancelUpload,
    createFolder: handleCreateFolder,
    deleteFolder: handleDeleteFolder,
    enableDropdownItem,
    disableDropdownItem,
    isEnabled,
    uploadedFilesCount,
    uploadDone,
    uploadRawFiles,
  };
}
