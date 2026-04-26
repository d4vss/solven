"use client";

import { useEffect, useState } from "react";
import {
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FlagIcon,
  FolderIcon,
  Link2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Meta = {
  hasPassword: boolean;
  expiresAt: string | null;
  expired: boolean;
  entryKind: "file" | "folder";
  entryId: string;
  entryName: string;
  entrySizeBytes?: number | null;
  currentFolder?: {
    id: string;
    name: string;
    parentId: string | null;
  };
  entries?: Array<{
    id: string;
    name: string;
    kind: string;
    sizeBytes: number;
  }>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function SharedFilePageClient({ token }: { token: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [accessPending, setAccessPending] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Array<{ id: string; name: string }>>([]);
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportIssueType, setReportIssueType] = useState("BROKEN_LINK");
  const [reportReason, setReportReason] = useState("");
  const [reportPending, setReportPending] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const r = await fetch(`/api/share/${token}`);
      const j = (await r.json()) as Meta & { error?: string };
      if (!mounted) return;
      if (!r.ok) {
        setError(j.error ?? "Invalid link");
      } else {
        setMeta(j);
        if (j.hasPassword && !unlocked) {
          setAccessOpen(true);
        }
        if (j.entryKind === "folder") {
          const id = j.currentFolder?.id ?? j.entryId;
          const name = j.currentFolder?.name ?? j.entryName;
          setCrumbs([{ id, name }]);
        } else {
          setCrumbs([]);
        }
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [token, unlocked]);

  async function loadFolderPage(folderId: string, targetPage: number) {
    setError(null);
    const q = new URLSearchParams({
      folderId,
      page: String(Math.max(1, targetPage)),
    });
    const r = await fetch(`/api/share/${token}?${q.toString()}`);
    const j = (await r.json()) as Meta & { error?: string };
    if (!r.ok) {
      setError(j.error ?? "Could not open folder");
      return false;
    }
    setMeta(j);
    return true;
  }

  function formatBytes(n: number) {
    if (n <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const rounded = i === 0 ? Math.round(v) : v < 10 ? Number(v.toFixed(1)) : Math.round(v);
    return `${rounded} ${units[i]}`;
  }

  async function openDownload(entryId?: string) {
    const targetId = entryId ?? "__root__";
    if (downloadedIds.includes(targetId) || downloadingIds.includes(targetId)) return;
    setError(null);
    setDownloadingIds((prev) => [...prev, targetId]);
    const r = await fetch(`/api/share/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...(entryId ? { entryId } : {}) }),
    });
    const j = (await r.json()) as { error?: string; url?: string };
    if (!r.ok || !j.url) {
      setDownloadingIds((prev) => prev.filter((id) => id !== targetId));
      setError(j.error ?? "Could not access file");
      return;
    }
    setDownloadingIds((prev) => prev.filter((id) => id !== targetId));
    setDownloadedIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
    window.location.assign(j.url);
  }

  async function verifyPasswordAndUnlock() {
    if (!meta?.hasPassword) {
      setUnlocked(true);
      return true;
    }
    setAccessError(null);
    setAccessPending(true);
    const r = await fetch(`/api/share/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: accessPassword,
        validateOnly: true,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setAccessPending(false);
    if (!r.ok) {
      setAccessError(j.error ?? "Invalid password");
      return false;
    }
    setAccessError(null);
    setPassword(accessPassword);
    setUnlocked(true);
    setAccessOpen(false);
    return true;
  }

  function guardDownload(entryId?: string) {
    if (meta?.hasPassword && !unlocked) {
      setAccessError(null);
      setAccessOpen(true);
      return;
    }
    void openDownload(entryId);
  }

  async function openFolder(folder: { id: string; name: string }) {
    const ok = await loadFolderPage(folder.id, 1);
    if (!ok) return;
    setCrumbs((prev) => {
      const existingIndex = prev.findIndex((x) => x.id === folder.id);
      if (existingIndex >= 0) return prev.slice(0, existingIndex + 1);
      return [...prev, { id: folder.id, name: folder.name }];
    });
  }

  async function goToCrumb(index: number) {
    const target = crumbs[index];
    if (!target) return;
    const ok = await loadFolderPage(target.id, 1);
    if (!ok) return;
    setCrumbs((prev) => prev.slice(0, index + 1));
  }

  function expiresLine() {
    if (!meta?.expiresAt) return "No link expiration";
    if (meta.expired) return "Expired";
    const d = new Date(meta.expiresAt);
    if (Number.isNaN(d.getTime())) return "Expires soon";
    return `Expires on ${d.toLocaleDateString()}`;
  }

  function currentSharePath() {
    const currentFolderId = crumbs.at(-1)?.id;
    if (meta?.entryKind !== "folder" || !currentFolderId || currentFolderId === meta.entryId) {
      return `/s/${token}`;
    }
    return `/s/${token}?folderId=${encodeURIComponent(currentFolderId)}`;
  }

  async function copyCurrentFolderUrl() {
    const path = currentSharePath();
    const absolute = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy link"), 1400);
    } catch {
      setError("Could not copy link");
    }
  }

  async function submitReport() {
    setError(null);
    setReportPending(true);
    const r = await fetch(`/api/share/${token}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueType: reportIssueType,
        reason: reportReason.trim(),
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setReportPending(false);
    if (!r.ok) {
      setError(j.error ?? "Could not submit report.");
      return;
    }
    setReportOpen(false);
    setReportReason("");
    setReportIssueType("BROKEN_LINK");
    setReportSuccessMessage("Report submitted. Thank you.");
    window.setTimeout(() => setReportSuccessMessage(null), 2000);
  }

  const explorerEntries =
    meta?.entryKind === "folder"
      ? (meta.entries ?? [])
      : meta
        ? [
            {
              id: meta.entryId,
              name: meta.entryName,
              kind: "file",
              sizeBytes: meta.entrySizeBytes ?? 0,
            },
          ]
        : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-24 md:px-8 md:pt-28">
      <section className="space-y-8 text-[13px] leading-snug text-foreground">
        <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-medium tracking-tight text-foreground">
              {meta?.entryKind === "folder" ? "Shared folder" : "Shared file"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meta?.entryName
                ? `${meta.entryName} via public link`
                : "Open and download through a public link"}
            </p>
          </div>
          <div className="inline-flex max-w-full items-center gap-1 rounded border border-border/70 bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
            <Link2Icon className="size-3.5" />
            <span className="max-w-[55vw] truncate sm:max-w-none">{currentSharePath()}</span>
          </div>
        </header>

        <div className="rounded border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Explorer preview
            </p>
            <div className="inline-flex w-full flex-wrap items-center justify-end gap-1 text-[11px] text-muted-foreground sm:w-auto sm:flex-nowrap">
              <Link2Icon className="size-3.5" />
              <span className="max-w-[52vw] truncate sm:max-w-none">{currentSharePath()}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                disabled={loading}
                onClick={() => void copyCurrentFolderUrl()}
              >
                {copyLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => setReportOpen(true)}
              >
                <FlagIcon className="size-3.5" />
                Report
              </Button>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-3">
          <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Link status
            </p>
            <p
              className={cn(
                "mt-1.5 font-mono text-xs",
                meta?.expired ? "text-destructive" : "text-foreground",
              )}
            >
              {loading ? "Loading..." : meta?.expired ? "Expired" : "Active"}
            </p>
          </div>
          <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Password
            </p>
            <p className="mt-1.5 font-mono text-xs text-foreground">
              {loading ? "Loading..." : meta?.hasPassword ? "Required" : "Not required"}
            </p>
          </div>
          <div className="rounded border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Expiration
            </p>
            <p className="mt-1.5 font-mono text-xs text-foreground">
              {loading ? "Loading..." : expiresLine()}
            </p>
          </div>
        </div>

        {meta?.expired ? (
          <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This share link has expired.
          </p>
        ) : null}
        {error ? (
          <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {reportSuccessMessage ? (
          <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {reportSuccessMessage}
          </p>
        ) : null}

          <div className="overflow-x-auto rounded border border-border">
            <div className="border-b border-border/70 bg-muted/25 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Contents
            </div>
            {meta?.entryKind === "folder" && crumbs.length > 0 ? (
              <div className="overflow-x-auto border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                <div className="flex min-w-max items-center gap-1">
                  {crumbs.map((crumb, i) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      {i > 0 ? <span>/</span> : null}
                      <button
                        type="button"
                        className={cn(
                          "rounded px-1 py-0.5",
                          i === crumbs.length - 1
                            ? "text-foreground"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                        onClick={() => void goToCrumb(i)}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <table className="w-full table-fixed border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="w-[52%] px-3 py-2 font-medium">Name</th>
                  <th className="w-[14%] px-3 py-2 font-medium">Type</th>
                  <th className="w-[14%] px-3 py-2 font-medium">Size</th>
                  <th className="w-[20%] px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {explorerEntries.length ? (
                  explorerEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <span className="flex items-start gap-2 font-mono text-[12px]">
                          {entry.kind === "folder" ? (
                            <FolderIcon className="size-3.5 text-muted-foreground" />
                          ) : (
                            <FileIcon className="size-3.5 text-muted-foreground" />
                          )}
                          <span className="min-w-0 break-all whitespace-normal" title={entry.name}>
                            {entry.name}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {entry.kind === "folder" ? "Folder" : "File"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {entry.kind === "folder" || entry.sizeBytes > 0
                          ? formatBytes(entry.sizeBytes)
                          : "0 B"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {entry.kind === "folder" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading || Boolean(meta?.expired)}
                            onClick={() => void openFolder({ id: entry.id, name: entry.name })}
                          >
                            Open
                          </Button>
                        ) : entry.kind === "file" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              loading ||
                              Boolean(meta?.expired) ||
                              downloadingIds.includes(entry.id) ||
                              downloadingIds.includes("__root__") ||
                              downloadedIds.includes(entry.id) ||
                              downloadedIds.includes("__root__")
                            }
                            onClick={() =>
                              meta?.entryKind === "folder"
                                ? guardDownload(entry.id)
                                : guardDownload()
                            }
                          >
                            {downloadedIds.includes(entry.id) || downloadedIds.includes("__root__") ? (
                              "Downloaded"
                            ) : downloadingIds.includes(entry.id) ||
                              downloadingIds.includes("__root__") ? (
                              "Downloading..."
                            ) : (
                              <>
                                <DownloadIcon className="size-4" />
                                Download
                              </>
                            )}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-sm text-muted-foreground">
                      Folder is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {meta?.entryKind === "folder" && (meta.pagination?.totalPages ?? 1) > 1 ? (
              <div className="flex flex-col items-start justify-between gap-2 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
                <span>
                  Page {meta.pagination?.page ?? 1} of {meta.pagination?.totalPages ?? 1}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={(meta.pagination?.page ?? 1) <= 1 || loading}
                    onClick={() =>
                      void loadFolderPage(
                        crumbs.at(-1)?.id ?? meta.entryId,
                        (meta.pagination?.page ?? 1) - 1,
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      (meta.pagination?.page ?? 1) >= (meta.pagination?.totalPages ?? 1) ||
                      loading
                    }
                    onClick={() =>
                      void loadFolderPage(
                        crumbs.at(-1)?.id ?? meta.entryId,
                        (meta.pagination?.page ?? 1) + 1,
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <Dialog
        open={accessOpen}
        onOpenChange={(open) => {
          setAccessOpen(open);
          if (!open) {
            setAccessPassword("");
            setShowAccessPassword(false);
            setAccessError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter password to download</DialogTitle>
            <DialogDescription>
              This shared item is protected. You can close this dialog anytime; it opens again when you try to download.
            </DialogDescription>
          </DialogHeader>
          {accessError ? (
            <p
              role="alert"
              className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {accessError}
            </p>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Password</label>
            <div className="relative">
              <Input
                type={showAccessPassword ? "text" : "password"}
                value={accessPassword}
                onChange={(e) => {
                  setAccessPassword(e.target.value);
                  setAccessError(null);
                }}
                placeholder="Enter password"
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void verifyPasswordAndUnlock();
                }}
              />
              <button
                type="button"
                aria-label={showAccessPassword ? "Hide password" : "Show password"}
                onClick={() => setShowAccessPassword((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showAccessPassword ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" disabled={accessPending} onClick={() => void verifyPasswordAndUnlock()}>
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) {
            setReportReason("");
            setReportIssueType("BROKEN_LINK");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this shared item</DialogTitle>
            <DialogDescription>
              Tell us what is wrong so the owner can review or remove it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">What is wrong?</p>
              <Select value={reportIssueType} onValueChange={setReportIssueType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select issue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROKEN_LINK">Broken link / file issue</SelectItem>
                  <SelectItem value="MALWARE_OR_VIRUS">Malware or virus</SelectItem>
                  <SelectItem value="COPYRIGHT">Copyright violation</SelectItem>
                  <SelectItem value="ILLEGAL_CONTENT">Illegal content</SelectItem>
                  <SelectItem value="SPAM_OR_PHISHING">Spam or phishing</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Reason</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Optional details"
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={reportPending} onClick={() => void submitReport()}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
