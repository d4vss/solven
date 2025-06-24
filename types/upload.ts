export type FileUploadState = "idle" | "uploading" | "uploaded" | "error";

export type FileObject = {
  file: File;
  fileKey: string;
  fileUrl: string;
  uploadProgress: number;
  status: FileUploadState;
  errorMessage?: string;
  abortController?: AbortController;
  timeRemaining?: number;
};
