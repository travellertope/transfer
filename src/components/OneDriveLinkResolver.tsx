"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";

/** Lets the user paste a OneDrive/SharePoint share link and auto-fills the path field, instead of hand-decoding the URL. */
export function OneDriveLinkResolver({
  connectionId,
  onResolved,
}: {
  connectionId: string;
  onResolved: (path: string, name: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resolve = async () => {
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/onedrive/resolve-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Couldn't resolve that link.");
      }
      onResolved(data.path, data.name);
      setUrl("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't resolve that link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              resolve();
            }
          }}
          placeholder="Paste a OneDrive/SharePoint link…"
          className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-xs"
        />
        <button
          type="button"
          onClick={resolve}
          disabled={loading || !url.trim()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:border-primary/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Resolve
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
