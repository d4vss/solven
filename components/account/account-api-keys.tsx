"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  KeyRound,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
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
import { toast } from "sonner";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function AccountApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetch("/api/account/api-keys");
      const j = (await r.json()) as { keys?: ApiKeyRow[]; error?: string };
      if (!r.ok) {
        setLoadError(j.error ?? "Could not load API keys.");
        setKeys([]);
        return;
      }
      setKeys(j.keys ?? []);
    } catch {
      setLoadError("Could not load API keys.");
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a label for this key.");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = (await r.json()) as { key?: string; error?: string };
      if (!r.ok) {
        toast.error(j.error ?? "Could not create key.");
        return;
      }
      if (j.key) {
        setRevealedSecret(j.key);
      }
      setNewName("");
      await load();
      toast.success("API key created");
    } catch {
      toast.error("Could not create key.");
    } finally {
      setCreating(false);
    }
  }

  async function onConfirmRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    try {
      const r = await fetch(`/api/account/api-keys/${revokeId}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Could not revoke key.");
        return;
      }
      toast.success("API key revoked");
      setRevokeId(null);
      await load();
    } catch {
      toast.error("Could not revoke key.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <section aria-labelledby="api-keys-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground">
            <KeyRound className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2
              id="api-keys-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              API keys
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded border border-border/70 bg-card/25 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Input
            id="new-api-key-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key name"
            maxLength={80}
            disabled={creating}
            className="max-w-md font-mono text-[12px]"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 rounded"
          disabled={creating}
          onClick={() => void onCreate()}
        >
          {creating ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <PlusIcon className="size-4" aria-hidden />
          )}
          Create key
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : keys === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Loading keys…
        </p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active API keys yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border/70">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/15 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Prefix</th>
                <th className="px-3 py-2 font-medium">Last used</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{k.keyPrefix}…</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setRevokeId(k.id)}
                    >
                      <Trash2Icon className="size-3.5" aria-hidden />
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(revealedSecret)} onOpenChange={() => setRevealedSecret(null)}>
        <DialogContent className="sm:max-w-lg" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              Store it in a password manager or secret store. For security, it cannot be
              shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Secret</label>
            <Input readOnly value={revealedSecret ?? ""} className="font-mono text-xs" />
            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-lg sm:w-auto"
              onClick={() => {
                if (revealedSecret) {
                  void navigator.clipboard.writeText(revealedSecret);
                  toast.success("Copied to clipboard");
                }
              }}
            >
              Copy to clipboard
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-lg"
              onClick={() => setRevealedSecret(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeId)} onOpenChange={(o) => !o && setRevokeId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-destructive" aria-hidden />
              Revoke this key?
            </DialogTitle>
            <DialogDescription>
              Scripts using this token will get{" "}
              <span className="font-mono text-foreground">401</span> immediately. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={revoking}
              onClick={() => setRevokeId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              disabled={revoking}
              onClick={() => void onConfirmRevoke()}
            >
              {revoking ? "Revoking…" : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
