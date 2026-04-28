"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  Loader2Icon,
  Share2Icon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { AccountPlanPayload } from "@/lib/account/api-plan-json";
import { PlanLimitDialog } from "@/components/account/plan-limit-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  presignMyUploadAction,
} from "@/app/actions/storage";
import {
  bulkDeleteAccountEntriesAction,
  createAccountFolderAction,
  createAccountShareLinkAction,
  deleteAccountEntryAction,
  getAccountEntryAction,
  getAccountPlanAction,
  listAccountEntriesAction,
  listAccountShareLinksAction,
  registerAccountUploadAction,
  revokeAccountShareLinkAction,
} from "@/lib/actions/account-explorer";
import { cn } from "@/lib/utils";

type SerializedEntry = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  sizeBytes: number;
  downloadCount: number;
  lastDownloadAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type UploadTask = {
  id: string;
  name: string;
  contentType: string;
  file: File;
  size: number;
  loaded: number;
  speedBps: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "msi",
  "com",
  "scr",
  "pif",
]);

type ShareLinkRow = {
  id: string;
  token: string;
  hasPassword: boolean;
  expiresAt: string | null;
  accessCount: number;
  lastAccessAt: string | null;
  createdAt: string | null;
};

function formatBytes(n: number) {
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded =
    i === 0 ? Math.round(v) : v < 10 ? Number(v.toFixed(1)) : Math.round(v);
  return `${rounded} ${units[i]}`;
}

function formatRate(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B/s";
  return `${formatBytes(n)}/s`;
}

function formatEta(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const d = Date.now() - t;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function expiresLabel(iso: string | null) {
  if (!iso) return "Never";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / 86_400_000);
  return `${days}d`;
}

function isPlanLimitCode(code: unknown): code is string {
  if (typeof code !== "string") return false;
  return (
    code.startsWith("PLAN_") ||
    code === "FILE_TOO_LARGE" ||
    code === "STORAGE_LIMIT_EXCEEDED" ||
    code === "DAILY_UPLOAD_LIMIT_EXCEEDED" ||
    code === "BANDWIDTH_LIMIT_EXCEEDED" ||
    code === "FAIR_USE_FLAGGED"
  );
}

function generatePassword(length = 16) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const buf = new Uint32Array(length);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < length; i += 1)
      buf[i] = Math.floor(Math.random() * 1e9);
  }
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[buf[i] % alphabet.length];
  }
  return out;
}

function extensionOfFileName(name: string) {
  const parts = name.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

function isBlockedUploadFile(name: string) {
  const ext = extensionOfFileName(name);
  return ext ? BLOCKED_UPLOAD_EXTENSIONS.has(ext) : false;
}

export function AccountExplorer({
  initialPlan,
}: {
  initialPlan: AccountPlanPayload | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const folderFromUrl = searchParams.get("folder");
  const [plan, setPlan] = useState<AccountPlanPayload | null>(initialPlan);
  const [crumbs, setCrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Files" },
  ]);
  const parentId = crumbs[crumbs.length - 1]?.id ?? null;
  const [entries, setEntries] = useState<SerializedEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [planLimitOpen, setPlanLimitOpen] = useState(false);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEntry, setShareEntry] = useState<SerializedEntry | null>(null);
  const [shareMode, setShareMode] = useState<"create" | "manage">("create");
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiryDate, setShareExpiryDate] = useState<Date | undefined>(
    undefined,
  );
  const [shareExpiryTime, setShareExpiryTime] = useState("12:00");
  const [shareLinks, setShareLinks] = useState<ShareLinkRow[]>([]);
  const [shareLinksLoading, setShareLinksLoading] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<SerializedEntry | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dragHoverFolderId, setDragHoverFolderId] = useState<string | null>(
    null,
  );
  const [isFileDropActive, setIsFileDropActive] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isRestoringFromQuery, setIsRestoringFromQuery] = useState(true);
  const activeUploadXhrs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const uploadTaskTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const uploadAbortByPlanRef = useRef(false);
  const uploadAbortReasonRef = useRef<string | null>(null);
  const uploadPlanDialogShownRef = useRef(false);
  const uploadRateLimitShownRef = useRef(false);

  function openPlanLimitDialog(message: string | null) {
    setPlanLimitMessage(message);
    setPlanLimitOpen(true);
  }

  const refreshPlan = useCallback(async () => {
    const r = await getAccountPlanAction();
    if (r.ok) {
      setPlan(r.data as AccountPlanPayload);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    if (isRestoringFromQuery) return;
    setLoading(true);
    try {
      const r = await listAccountEntriesAction({ parentId, page, pageSize });
      if (!r.ok) throw new Error(r.error || "list");
      const j = r.data as {
        entries: SerializedEntry[];
        page?: number;
        pageSize?: number;
        total?: number;
      };
      setEntries(j.entries);
      setPage(j.page ?? page);
      setPageSize(j.pageSize ?? pageSize);
      setTotalEntries(j.total ?? j.entries.length);
      setSelectedIds((prev) =>
        prev.filter((id) => j.entries.some((e) => e.id === id)),
      );
    } catch {
      toast.error("Could not load files.");
    } finally {
      setLoading(false);
    }
  }, [isRestoringFromQuery, page, pageSize, parentId]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!initialPlan) void refreshPlan();
  }, [initialPlan, refreshPlan]);

  useEffect(() => {
    let cancelled = false;
    const root = [{ id: null, name: "Files" as const }];
    setIsRestoringFromQuery(true);
    if (!folderFromUrl) {
      setCrumbs((prev) => {
        if (
          prev.length === 1 &&
          prev[0]?.id === null &&
          prev[0]?.name === "Files"
        ) {
          return prev;
        }
        return root;
      });
      setIsRestoringFromQuery(false);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const chain: Array<{ id: string; name: string }> = [];
      let cursorId: string | null = folderFromUrl;
      for (let i = 0; i < 64 && cursorId; i += 1) {
        const r = await getAccountEntryAction(cursorId);
        if (!r.ok) break;
        const j = r.data as {
          entry?: {
            id: string;
            parentId: string | null;
            name: string;
            kind: string;
          };
        };
        const entry = j.entry;
        if (!entry || entry.kind !== "folder") break;
        chain.unshift({ id: entry.id, name: entry.name });
        cursorId = entry.parentId;
      }
      if (cancelled) return;
      if (chain.length === 0) {
        setCrumbs((prev) => {
          if (
            prev.length === 1 &&
            prev[0]?.id === null &&
            prev[0]?.name === "Files"
          ) {
            return prev;
          }
          return root;
        });
      } else {
        const nextCrumbs = [...root, ...chain];
        setCrumbs((prev) => {
          if (
            prev.length === nextCrumbs.length &&
            prev.every(
              (c, i) =>
                c.id === nextCrumbs[i]?.id && c.name === nextCrumbs[i]?.name,
            )
          ) {
            return prev;
          }
          return nextCrumbs;
        });
      }
      setIsRestoringFromQuery(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [folderFromUrl]);

  useEffect(() => {
    if (isRestoringFromQuery) return;
    const currentFolderId = crumbs[crumbs.length - 1]?.id ?? null;
    const inUrl = searchParams.get("folder");
    if ((inUrl ?? null) === currentFolderId) return;
    const next = new URLSearchParams(searchParams.toString());
    if (currentFolderId) {
      next.set("folder", currentFolderId);
    } else {
      next.delete("folder");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [crumbs, isRestoringFromQuery, pathname, router, searchParams]);

  function enterFolder(e: SerializedEntry) {
    if (e.kind !== "folder") return;
    setPage(1);
    setCrumbs((c) => [...c, { id: e.id, name: e.name }]);
  }

  function crumbTo(i: number) {
    setPage(1);
    setCrumbs((c) => c.slice(0, i + 1));
  }

  async function mkFolder() {
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Folder name is required.");
      return;
    }
    setBusy(true);
    try {
      const r = await createAccountFolderAction({ name, parentId });
      if (!r.ok) {
        const msg =
          typeof r.error === "string" ? r.error : "Could not create folder.";
        if (isPlanLimitCode(r.code)) {
          openPlanLimitDialog(msg);
          return;
        }
        toast.error(msg);
        return;
      }
      await loadEntries();
      await refreshPlan();
      setCreateFolderOpen(false);
      setNewFolderName("");
      toast.success("Folder created.");
    } finally {
      setBusy(false);
    }
  }

  function updateUploadTask(id: string, patch: Partial<UploadTask>) {
    setUploadTasks((prev) => {
      const next = prev.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      );
      const updated = next.find((task) => task.id === id);
      if (!updated) return next;

      const existingTimer = uploadTaskTimersRef.current.get(id);
      if (updated.status === "uploading") {
        if (existingTimer) {
          clearTimeout(existingTimer);
          uploadTaskTimersRef.current.delete(id);
        }
        return next;
      }

      if (!existingTimer) {
        const timer = setTimeout(() => {
          removeUploadTask(id);
          uploadTaskTimersRef.current.delete(id);
        }, 5000);
        uploadTaskTimersRef.current.set(id, timer);
      }

      return next;
    });
  }

  function removeUploadTask(id: string) {
    const timer = uploadTaskTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      uploadTaskTimersRef.current.delete(id);
    }
    setUploadTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function abortAllActiveUploads(reason: string, exceptTaskId?: string) {
    setUploadTasks((prev) =>
      prev.map((task) =>
        task.status === "uploading" && task.id !== exceptTaskId
          ? { ...task, status: "error", error: reason }
          : task,
      ),
    );
    for (const [taskId, xhr] of activeUploadXhrs.current.entries()) {
      if (taskId === exceptTaskId) continue;
      try {
        xhr.abort();
      } catch {
        /* ignore */
      }
    }
  }

  function stopUploadsForPlanLimit(taskId: string, message: string) {
    uploadAbortByPlanRef.current = true;
    uploadAbortReasonRef.current = "Stopped due to plan limit.";
    abortAllActiveUploads("Stopped due to plan limit.", taskId);
    if (!uploadPlanDialogShownRef.current) {
      uploadPlanDialogShownRef.current = true;
      openPlanLimitDialog(message);
    }
  }

  function stopUploadsForRateLimit(taskId: string, message: string) {
    uploadAbortReasonRef.current = "Stopped due to rate limit.";
    abortAllActiveUploads("Stopped due to rate limit.", taskId);
    if (!uploadRateLimitShownRef.current) {
      uploadRateLimitShownRef.current = true;
      toast.error(
        message || "Too many upload requests. Please wait and try again.",
      );
    }
  }

  function uploadToPresignedUrl(input: {
    taskId: string;
    url: string;
    file: File;
    onProgress: (loaded: number, speedBps: number) => void;
  }) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let latestLoaded = 0;
      let tickLoaded = 0;
      let tickAt = Date.now();
      const tickMs = 500;
      const timer = setInterval(() => {
        const now = Date.now();
        const deltaBytes = latestLoaded - tickLoaded;
        const deltaMs = Math.max(now - tickAt, 1);
        const speedBps = (deltaBytes / deltaMs) * 1000;
        tickLoaded = latestLoaded;
        tickAt = now;
        input.onProgress(latestLoaded, speedBps);
      }, tickMs);

      xhr.open("PUT", input.url, true);
      activeUploadXhrs.current.set(input.taskId, xhr);
      xhr.setRequestHeader(
        "Content-Type",
        input.file.type || "application/octet-stream",
      );

      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        latestLoaded = ev.loaded;
      };

      xhr.onerror = () => {
        clearInterval(timer);
        activeUploadXhrs.current.delete(input.taskId);
        reject(new Error("Upload to storage failed."));
      };
      xhr.onabort = () => {
        clearInterval(timer);
        activeUploadXhrs.current.delete(input.taskId);
        reject(new Error("Upload cancelled."));
      };
      xhr.onload = () => {
        clearInterval(timer);
        activeUploadXhrs.current.delete(input.taskId);
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload to storage failed."));
      };

      xhr.send(input.file);
    });
  }

  async function uploadFile(task: UploadTask) {
    const { id: taskId } = task;
    if (uploadAbortByPlanRef.current || uploadAbortReasonRef.current) {
      updateUploadTask(taskId, {
        status: "error",
        error: uploadAbortReasonRef.current ?? "Stopped due to plan limit.",
      });
      return false;
    }
    try {
      updateUploadTask(taskId, { status: "uploading" });
      const pr = await presignMyUploadAction({
        filename: task.name,
        contentType: task.contentType || "application/octet-stream",
        sizeBytes: task.size,
      }).catch((e) => ({ error: (e as Error).message } as { error: string }));
      const pj = pr as {
        error?: string;
        url?: string;
        key?: string;
        code?: string;
      };
      if (!pj.url || !pj.key) {
        updateUploadTask(taskId, {
          status: "error",
          error: pj.error ?? "Upload prep failed.",
        });
        if (isPlanLimitCode(pj.code)) {
          stopUploadsForPlanLimit(
            taskId,
            pj.error ?? "Upload could not start.",
          );
          return false;
        }
        toast.error(pj.error ?? "Upload prep failed.");
        return false;
      }
      if (uploadAbortByPlanRef.current || uploadAbortReasonRef.current) {
        updateUploadTask(taskId, {
          status: "error",
          error: uploadAbortReasonRef.current ?? "Stopped due to plan limit.",
        });
        return false;
      }
      await uploadToPresignedUrl({
        taskId,
        url: pj.url!,
        file: task.file,
        onProgress: (loaded, speedBps) => {
          updateUploadTask(taskId, {
            loaded,
            speedBps,
            status: "uploading",
          });
        },
      });
      const rr = await registerAccountUploadAction({
        key: pj.key,
        name: task.name,
        expectedSizeBytes: task.size,
        parentId,
      });
      if (!rr.ok) {
        updateUploadTask(taskId, {
          status: "error",
          error: rr.error ?? "Register failed.",
        });
        if (isPlanLimitCode(rr.code)) {
          stopUploadsForPlanLimit(
            taskId,
            rr.error ?? "Could not register file.",
          );
          return false;
        }
        toast.error(rr.error ?? "Register failed.");
        return false;
      }
      updateUploadTask(taskId, {
        loaded: task.size,
        speedBps: 0,
        status: "done",
      });
      await loadEntries();
      await refreshPlan();
      return true;
    } catch (e) {
      const message = (e as Error).message ?? "Upload failed.";
      updateUploadTask(taskId, { status: "error", error: message });
      if (message !== "Upload cancelled.") {
        toast.error(message);
      }
      return false;
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const blocked = list.filter((file) => isBlockedUploadFile(file.name));
    if (blocked.length > 0) {
      toast.error(
        `Blocked file type: ${blocked.map((f) => f.name).join(", ")}`,
      );
    }
    const allowed = list.filter((file) => !isBlockedUploadFile(file.name));
    if (allowed.length === 0) return;
    const maxSingleFileBytes = plan?.plan.limits.maxSingleFileBytes;
    const oversizedByPlan =
      typeof maxSingleFileBytes === "number"
        ? allowed.filter((file) => file.size > maxSingleFileBytes)
        : [];
    const sizeAllowedFiles =
      typeof maxSingleFileBytes === "number"
        ? allowed.filter((file) => file.size <= maxSingleFileBytes)
        : allowed;
    if (oversizedByPlan.length > 0) {
      openPlanLimitDialog(
        `${oversizedByPlan.length} file(s) exceed your plan's max file size (${formatBytes(maxSingleFileBytes ?? 0)}) and were skipped.`,
      );
    }
    if (sizeAllowedFiles.length === 0) return;
    const queuedTasks = sizeAllowedFiles.map((file) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      file,
      size: file.size,
      loaded: 0,
      speedBps: 0,
      status: "queued" as const,
    }));
    setUploadTasks((prev) => [...prev, ...queuedTasks]);
    uploadAbortByPlanRef.current = false;
    uploadAbortReasonRef.current = null;
    uploadPlanDialogShownRef.current = false;
    uploadRateLimitShownRef.current = false;
    setBusy(true);
    try {
      const maxConcurrentUploads = 5;
      let cursor = 0;
      const workerCount = Math.min(maxConcurrentUploads, queuedTasks.length);
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (cursor < queuedTasks.length) {
            const task = queuedTasks[cursor];
            cursor += 1;
            if (!task) break;
            await uploadFile(task);
          }
        }),
      );
    } finally {
      uploadAbortByPlanRef.current = false;
      uploadAbortReasonRef.current = null;
      uploadPlanDialogShownRef.current = false;
      uploadRateLimitShownRef.current = false;
      setBusy(false);
    }
  }

  async function doDownload(id: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/account/entries/${id}/download`, {
        method: "POST",
      });
      const contentType = r.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const j = (await r.json()) as { error?: string; url?: string };
        if (!r.ok) {
          toast.error(j.error ?? "Download failed.");
          return;
        }
        window.open(j.url, "_blank", "noopener,noreferrer");
      } else {
        if (!r.ok) {
          toast.error("Download failed.");
          return;
        }
        const blob = await r.blob();
        const contentDisposition = r.headers.get("content-disposition") ?? "";
        const match = /filename="([^"]+)"/i.exec(contentDisposition);
        const filename = match?.[1] ?? "download.zip";
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      }
      await loadEntries();
    } finally {
      setBusy(false);
    }
  }

  function openShareDialog(e: SerializedEntry) {
    setShareEntry(e);
    setShareMode("create");
    setSharePassword("");
    setShareExpiryDate(undefined);
    setShareExpiryTime("12:00");
    setShareLinks([]);
    setShareOpen(true);
  }

  const loadShareLinks = useCallback(async (entryId: string) => {
    setShareLinksLoading(true);
    try {
      const r = await listAccountShareLinksAction(entryId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not load share links.");
        return;
      }
      setShareLinks((r.data.links as ShareLinkRow[]) ?? []);
    } finally {
      setShareLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shareOpen || !shareEntry) return;
    void loadShareLinks(shareEntry.id);
  }, [loadShareLinks, shareEntry, shareOpen]);

  useEffect(() => {
    if (shareMode === "manage" && shareLinks.length === 0) {
      setShareMode("create");
    }
  }, [shareLinks.length, shareMode]);

  async function createShareLink() {
    if (!shareEntry) return;
    let expiresAt: string | undefined;
    if (shareExpiryDate) {
      const [hRaw, mRaw] = shareExpiryTime.split(":");
      const hours = Number(hRaw);
      const minutes = Number(mRaw);
      if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        toast.error("Invalid time format.");
        return;
      }
      const d = new Date(shareExpiryDate);
      d.setHours(hours, minutes, 0, 0);
      if (Number.isNaN(d.getTime())) {
        toast.error("Invalid expiry date format.");
        return;
      }
      expiresAt = d.toISOString();
    }
    setBusy(true);
    try {
      const r = await createAccountShareLinkAction({
        entryId: shareEntry.id,
        ...(sharePassword.trim() ? { password: sharePassword.trim() } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
      });
      if (!r.ok || !r.data.url) {
        const msg = r.ok ? "Could not create share link." : r.error;
        if (msg.toLowerCase().includes("plan")) {
          openPlanLimitDialog(msg);
          return;
        }
        toast.error(msg);
        return;
      }
      await navigator.clipboard.writeText(r.data.url);
      await loadShareLinks(shareEntry.id);
      toast.success("Share link copied to clipboard.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/s/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  }

  async function revokeShareLinkById(shareId: string) {
    if (!shareEntry) return;
    setRevokingShareId(shareId);
    try {
      const r = await revokeAccountShareLinkAction(shareId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete share link.");
        return;
      }
      setShareLinks((prev) => prev.filter((link) => link.id !== shareId));
      toast.success("Share link deleted.");
    } finally {
      setRevokingShareId(null);
    }
  }

  function openDeleteDialog(entry: SerializedEntry) {
    setDeleteEntry(entry);
    setDeleteOpen(true);
  }

  async function doDelete() {
    if (!deleteEntry) return;
    setBusy(true);
    try {
      const r = await deleteAccountEntryAction(deleteEntry.id);
      if (!r.ok) {
        toast.error(r.error ?? "Delete failed.");
        return;
      }
      await loadEntries();
      await refreshPlan();
      setDeleteOpen(false);
      setDeleteEntry(null);
      toast.success("Deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      const r = await bulkDeleteAccountEntriesAction({ entryIds: selectedIds });
      if (!r.ok) {
        toast.error(r.error ?? "Could not delete selected items.");
        return;
      }
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      await loadEntries();
      await refreshPlan();
      toast.success(
        `Deleted ${r.data.deleted ?? selectedIds.length} selected item(s).`,
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, id]))
        : prev.filter((x) => x !== id),
    );
  }

  function onEntryDragStart(
    ev: DragEvent<HTMLTableRowElement>,
    entryId: string,
  ) {
    const ids = selectedIds.includes(entryId) ? selectedIds : [entryId];
    setDragIds(ids);
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData(
      "application/x-solven-entry-ids",
      JSON.stringify(ids),
    );
    ev.dataTransfer.setData("text/plain", entryId);
  }

  function hasNativeFilesDrag(ev: DragEvent<HTMLElement>) {
    return Array.from(ev.dataTransfer.types).includes("Files");
  }

  function onExplorerDragOver(ev: DragEvent<HTMLDivElement>) {
    if (!hasNativeFilesDrag(ev)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
    if (!isFileDropActive) setIsFileDropActive(true);
  }

  function onExplorerDragLeave(ev: DragEvent<HTMLDivElement>) {
    if (!hasNativeFilesDrag(ev)) return;
    const nextTarget = ev.relatedTarget as Node | null;
    if (!nextTarget || !ev.currentTarget.contains(nextTarget)) {
      setIsFileDropActive(false);
    }
  }

  function onExplorerDrop(ev: DragEvent<HTMLDivElement>) {
    if (!hasNativeFilesDrag(ev)) return;
    ev.preventDefault();
    setIsFileDropActive(false);
    if (busy) return;
    void uploadFiles(ev.dataTransfer.files);
  }

  const limits = plan?.plan.limits;
  const uploadDailyCap = limits?.dailyUploadBytesCap ?? null;
  const uploadUsedToday = plan?.usage.uploadUsedTodayBytes ?? 0;
  const storageCap = limits?.maxTotalStorageBytes ?? null;
  const storageUsed = plan?.usage.usedBytes ?? 0;
  const storageRatio =
    storageCap && storageCap > 0
      ? Math.min(1, Math.max(0, storageUsed / storageCap))
      : 0;
  const uploadDailyRatio =
    uploadDailyCap && uploadDailyCap > 0
      ? Math.min(1, Math.max(0, uploadUsedToday / uploadDailyCap))
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  return (
    <div className="rounded border border-border bg-card text-[13px] leading-snug text-foreground">
      <div className="flex items-center border-b border-border bg-muted/20 px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Explorer
        </p>
      </div>
      <div className="space-y-8 p-4">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-medium tracking-tight text-foreground">
              Storage
            </h1>
            <p className="mt-1 max-w-md text-muted-foreground">
              Browse, upload, and organize everything in your storage space.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/50">
              <UploadIcon className="size-3.5" aria-hidden />
              <span>Upload</span>
              <input
                type="file"
                multiple
                className="sr-only"
                disabled={busy}
                onChange={(ev) => {
                  const files = ev.target.files;
                  ev.target.value = "";
                  if (files && files.length > 0) void uploadFiles(files);
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreateFolderOpen(true)}
              className="rounded border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/50 disabled:opacity-50"
            >
              New folder
            </button>
            {busy ? (
              <Loader2Icon
                className="size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </div>
        </header>
        {uploadTasks.length > 0 ? (
          <section className="space-y-2 rounded-lg border border-border/70 bg-muted/15 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Uploads
            </p>
            <div className="space-y-2">
              {uploadTasks.map((task) => {
                const progress =
                  task.size > 0 ? Math.min(task.loaded / task.size, 1) : 0;
                const etaSeconds =
                  task.speedBps > 0
                    ? (task.size - task.loaded) / task.speedBps
                    : Number.POSITIVE_INFINITY;
                return (
                  <div
                    key={task.id}
                    className="rounded-md border border-border/60 bg-background/80 px-2.5 py-2"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p
                        className="truncate font-mono text-[12px] text-foreground"
                        title={task.name}
                      >
                        {task.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {Math.round(progress * 100)}%
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-[width] duration-200",
                          task.status === "error"
                            ? "bg-destructive"
                            : task.status === "done"
                              ? "bg-primary"
                              : "bg-foreground/70",
                        )}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {formatBytes(task.loaded)} / {formatBytes(task.size)}
                      </span>
                      {task.status === "queued" ? (
                        <span>Queued</span>
                      ) : task.status === "uploading" ? (
                        <span>
                          {formatRate(task.speedBps)} · {formatEta(etaSeconds)}
                        </span>
                      ) : task.status === "done" ? (
                        <span>Done</span>
                      ) : (
                        <span>{task.error ?? "Failed"}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Plan
              </p>
              <p className="mt-1.5 font-mono text-xs text-foreground">
                {plan?.plan.visual.label ?? "Free"}
              </p>
            </div>
            <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Storage
              </p>
              <p className="mt-1.5 font-mono text-xs text-foreground">
                {plan
                  ? `${formatBytes(plan.usage.usedBytes)}${limits ? ` / ${formatBytes(limits.maxTotalStorageBytes)}` : ""}`
                  : "Loading..."}
              </p>
              {plan && storageCap ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-border/60">
                  <div
                    className={cn(
                      "h-full rounded transition-[width]",
                      storageRatio >= 1
                        ? "bg-destructive"
                        : storageRatio >= 0.85
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${storageRatio * 100}%` }}
                  />
                </div>
              ) : null}
            </div>
            <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Files
              </p>
              <p className="mt-1.5 font-mono text-xs text-foreground">
                {plan ? `${plan.usage.fileCount}` : "Loading..."}
              </p>
            </div>
            <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Upload/day
              </p>
              <p className="mt-1.5 font-mono text-xs text-foreground">
                {plan
                  ? uploadDailyCap
                    ? `${formatBytes(uploadUsedToday)} / ${formatBytes(uploadDailyCap)}`
                    : "Unlimited"
                  : "Loading..."}
              </p>
              {plan && uploadDailyCap ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-border/60">
                  <div
                    className={cn(
                      "h-full rounded transition-[width]",
                      uploadDailyRatio >= 1
                        ? "bg-destructive"
                        : uploadDailyRatio >= 0.85
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${uploadDailyRatio * 100}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-1 text-xs text-muted-foreground">
              {crumbs.map((c, i) => (
                <span
                  key={`${c.id ?? "root"}-${i}`}
                  className="flex items-center"
                >
                  {i > 0 ? (
                    <ChevronRightIcon className="mx-0.5 size-3 text-border" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (i === crumbs.length - 1) return;
                      crumbTo(i);
                    }}
                    className={cn(
                      "rounded px-1 py-0.5 font-mono text-[12px] tracking-tight",
                      i === crumbs.length - 1
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                    aria-current={i === crumbs.length - 1 ? "page" : undefined}
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex flex-col items-start justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs sm:flex-row sm:items-center">
              <span className="text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  Delete selected
                </Button>
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              "overflow-x-auto rounded border border-border transition-colors",
              isFileDropActive && "border-primary bg-primary/5",
            )}
            onDragOver={onExplorerDragOver}
            onDragLeave={onExplorerDragLeave}
            onDrop={onExplorerDrop}
          >
            {isFileDropActive ? (
              <div className="border-b border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                Drop files to upload into this folder
              </div>
            ) : null}
            <Table className="w-full min-w-[760px] table-fixed text-left text-[13px]">
              <TableHeader className="bg-muted/25">
                <TableRow className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <TableHead className="w-10 px-3">
                    <Checkbox
                      aria-label="Select all entries"
                      checked={
                        entries.length > 0 &&
                        entries.every((e) => selectedIds.includes(e.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setSelectedIds(entries.map((e) => e.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[38%] px-3">Name</TableHead>
                  <TableHead className="w-[11%] px-3">Size</TableHead>
                  <TableHead className="w-[11%] px-3">Downloads</TableHead>
                  <TableHead className="w-[16%] px-3">Last download</TableHead>
                  <TableHead className="w-[10%] px-3">Expires in</TableHead>
                  <TableHead className="w-[14%] px-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      Empty folder.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow
                      key={e.id}
                      data-state={
                        selectedIds.includes(e.id) ? "selected" : undefined
                      }
                      draggable={!busy}
                      onDragStart={(ev) => onEntryDragStart(ev, e.id)}
                      onDragEnd={() => {
                        setDragIds([]);
                        setDragHoverFolderId(null);
                      }}
                      onDragOver={(ev) => {
                        if (e.kind !== "folder") return;
                        if (hasNativeFilesDrag(ev)) return;
                        ev.preventDefault();
                        setDragHoverFolderId(e.id);
                      }}
                      onDragLeave={() => {
                        if (dragHoverFolderId === e.id)
                          setDragHoverFolderId(null);
                      }}
                      onDrop={(ev) => {
                        if (e.kind !== "folder") return;
                        if (hasNativeFilesDrag(ev)) return;
                        ev.preventDefault();
                        const raw = ev.dataTransfer.getData(
                          "application/x-solven-entry-ids",
                        );
                        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
                        const ids = parsed.length > 0 ? parsed : dragIds;
                        if (ids.length === 0) {
                          toast.error("Could not determine dragged items.");
                          return;
                        }
                        if (ids.includes(e.id)) {
                          toast.error(
                            "Drop selected items into another folder.",
                          );
                          return;
                        }
                      }}
                      className={cn(
                        "border-border/80 hover:bg-muted/20",
                        dragHoverFolderId === e.id && "bg-muted/40",
                      )}
                    >
                      <TableCell className="px-3">
                        <Checkbox
                          checked={selectedIds.includes(e.id)}
                          aria-label={`Select ${e.name}`}
                          onCheckedChange={(checked) =>
                            toggleSelected(e.id, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell className="px-3">
                        <button
                          type="button"
                          onClick={() =>
                            e.kind === "folder" ? enterFolder(e) : undefined
                          }
                          className={cn(
                            "flex w-full min-w-0 items-center gap-2 overflow-hidden font-mono text-[12px] tracking-tight",
                            e.kind === "folder"
                              ? "text-foreground hover:underline"
                              : "cursor-default text-foreground/90",
                          )}
                          title={e.name}
                        >
                          {e.kind === "folder" ? (
                            <FolderIcon className="size-3.5 text-muted-foreground" />
                          ) : (
                            <FileIcon className="size-3.5 text-muted-foreground" />
                          )}
                          <span className="min-w-0 truncate">{e.name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground">
                        {formatBytes(e.sizeBytes)}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground">
                        {e.kind === "folder" ? "—" : e.downloadCount}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground">
                        {e.kind === "folder" ? "—" : relTime(e.lastDownloadAt)}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-muted-foreground">
                        {e.kind === "folder" ? "—" : expiresLabel(e.expiresAt)}
                      </TableCell>
                      <TableCell className="px-3 text-right">
                        <div className="flex justify-end gap-1">
                          {e.kind === "file" || e.kind === "folder" ? (
                            <button
                              type="button"
                              disabled={busy}
                              title="Share"
                              onClick={() => openShareDialog(e)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                            >
                              <Share2Icon className="size-3.5" />
                            </button>
                          ) : null}
                          {e.kind === "file" || e.kind === "folder" ? (
                            <button
                              type="button"
                              disabled={busy}
                              title={
                                e.kind === "folder"
                                  ? "Download as ZIP"
                                  : "Download"
                              }
                              onClick={() => void doDownload(e.id)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                            >
                              <DownloadIcon className="size-3.5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            title="Delete"
                            onClick={() => openDeleteDialog(e)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {hydrated ? (
            <div className="flex flex-col items-start justify-between gap-2 pt-2 sm:flex-row sm:items-center">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({totalEntries} items)
              </p>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      const next = Number(value);
                      if (!Number.isFinite(next) || next <= 0) return;
                      setPage(1);
                      setPageSize(Math.min(100, Math.max(5, next)));
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="h-8 min-w-[72px] text-xs"
                    >
                      <SelectValue placeholder="25" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || busy || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || busy || page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
          <div className="pt-1 sm:text-right">
            {plan ? (
              <p className="text-xs text-muted-foreground">
                {formatBytes(plan.usage.usedBytes)}
                {limits ? ` / ${formatBytes(limits.maxTotalStorageBytes)}` : ""}
                <span className="text-muted-foreground/60"> · </span>
                {plan.usage.fileCount}
                {" files"}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">Loading…</span>
            )}
          </div>
        </section>
      </div>

      <PlanLimitDialog
        open={planLimitOpen}
        onOpenChange={setPlanLimitOpen}
        message={planLimitMessage}
        currentPlanSlug={plan?.slug ?? "free"}
      />
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>
              Add a new folder in the current location.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void mkFolder();
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateFolderOpen(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void mkFolder()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteEntry(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteEntry?.kind ?? "item"}?</DialogTitle>
            <DialogDescription>
              {deleteEntry ? (
                <>
                  This will permanently remove{" "}
                  <span className="break-all whitespace-normal">
                    &quot;{deleteEntry.name}&quot;
                  </span>
                  .
                </>
              ) : (
                "This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteEntry(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void doDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected items?</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.length} selected
              item(s). Folders include all nested files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || selectedIds.length === 0}
              onClick={() => void deleteSelected()}
            >
              Delete selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) setShareEntry(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create share link</DialogTitle>
            <DialogDescription>
              {shareEntry?.name ?? "Selected file"}. This only configures the
              public link, not file auto-delete rules.
            </DialogDescription>
          </DialogHeader>
          {shareLinks.length > 0 ? (
            <div className="flex items-center gap-2 border-b border-border/70 pb-3">
              <Button
                type="button"
                variant={shareMode === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setShareMode("create")}
              >
                New link
              </Button>
              <Button
                type="button"
                variant={shareMode === "manage" ? "default" : "outline"}
                size="sm"
                onClick={() => setShareMode("manage")}
              >
                Active links
              </Button>
            </div>
          ) : null}
          <div className="space-y-4">
            {shareMode === "create" ? (
              <>
                <div className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Password protection
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Optional. Leave empty for no password.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Optional password"
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSharePassword(generatePassword(18))}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Link expiration
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Optional. Empty means no expiration.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={shareExpiryTime}
                        onChange={(e) => setShareExpiryTime(e.target.value)}
                        disabled={!shareExpiryDate}
                        className="w-32"
                      />
                      {shareExpiryDate ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-9 shrink-0"
                              aria-label="Reset"
                              onClick={() => setShareExpiryDate(undefined)}
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reset</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                    <Calendar
                      mode="single"
                      selected={shareExpiryDate}
                      onSelect={setShareExpiryDate}
                      className="rounded-lg border"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border/70 bg-background p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-foreground">
                    Active share links
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Manage links for this {shareEntry?.kind ?? "item"}.
                  </p>
                </div>
                {shareLinksLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Loading links...
                  </p>
                ) : shareLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active links yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shareLinks.map((link) => (
                      <div
                        key={link.id}
                        className="rounded border border-border/60 bg-muted/10 px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="truncate font-mono text-[11px] text-foreground"
                            title={link.token}
                          >
                            /s/{link.token}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => void copyShareLink(link.token)}
                            >
                              <CopyIcon className="size-3.5" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2"
                              disabled={revokingShareId === link.id}
                              onClick={() => void revokeShareLinkById(link.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {link.hasPassword ? "Password" : "No password"} ·{" "}
                          {link.expiresAt
                            ? `Expires ${relTime(link.expiresAt)}`
                            : "No expiry"}{" "}
                          · {link.accessCount} visits
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShareOpen(false)}
            >
              Cancel
            </Button>
            {shareMode === "create" ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void createShareLink()}
              >
                Create link
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
