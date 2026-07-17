"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowUpDown, RotateCw, AlertCircle } from "lucide-react";
import type { TransferRecord } from "@/lib/wordpress";
import { formatBytes, formatDuration, estimateSecondsRemaining } from "@/lib/limits";

interface ActiveJob {
  id: string;
  status: "queued" | "connecting" | "transferring";
  bytesTransferred: number;
  totalBytes: number | null;
  bytesPerSecond: number | null;
  error: string | null;
  message: string | null;
  sourceHost: string;
  sourcePath: string;
  destHost: string;
  destPath: string;
}

const POLL_MS = 2000;

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  in_progress: "In Progress",
  success: "Success",
  failed: "Failed",
};

export default function HistoryPage() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "in_progress" | "success" | "failed">("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState("");
  const prevActiveCount = useRef(0);

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      const [histData, jobsData] = await Promise.all([
        fetch("/api/history").then((r) => r.json()).catch(() => ({ transfers: [] })),
        fetch("/api/transfer").then((r) => r.json()).catch(() => ({ jobs: [] })),
      ]);
      if (stopped) return;

      const jobs: ActiveJob[] = jobsData.jobs ?? [];
      // A job just finished since the last poll — refetch history again shortly
      // so the newly-written record shows up without waiting a full interval.
      if (prevActiveCount.current > jobs.length) {
        setTimeout(() => {
          fetch("/api/history").then((r) => r.json()).then((d) => {
            if (!stopped) setTransfers(d.transfers ?? []);
          }).catch(() => {});
        }, 800);
      }
      prevActiveCount.current = jobs.length;

      setTransfers(histData.transfers ?? []);
      setActiveJobs(jobs);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const handleRetry = async (t: TransferRecord) => {
    if (!t.source || !t.destination) return;
    setRetryError("");
    setRetryingId(t.id);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: t.source, destination: t.destination }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRetryError(data.error || "Retry failed to start.");
        return;
      }
      setActiveJobs((prev) => [
        {
          id: data.job.id,
          status: data.job.status,
          bytesTransferred: data.job.bytesTransferred,
          totalBytes: data.job.totalBytes,
          bytesPerSecond: data.job.bytesPerSecond,
          error: data.job.error,
          message: data.job.message,
          sourceHost: t.source_host,
          sourcePath: t.source_path,
          destHost: t.dest_host,
          destPath: t.dest_path,
        },
        ...prev,
      ]);
    } catch {
      setRetryError("Network error. Please try again.");
    } finally {
      setRetryingId(null);
    }
  };

  const filtered = filter === "all" ? transfers : transfers.filter((t) => t.status === filter);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer History</h1>
          <p className="text-slate-500 text-sm mt-1">Last {transfers.length} transfers stored.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "in_progress", "success", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary/10 text-primary-light"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {retryError && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{retryError}</span>
        </div>
      )}

      {activeJobs.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">In Progress</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {activeJobs.map((job) => {
              const pct =
                job.totalBytes && job.totalBytes > 0
                  ? Math.min(100, Math.round((job.bytesTransferred / job.totalBytes) * 100))
                  : null;
              const etaSeconds = estimateSecondsRemaining(job.bytesTransferred, job.totalBytes, job.bytesPerSecond);
              return (
                <div key={job.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="w-4 h-4 text-primary-light animate-spin shrink-0" />
                    <p className="font-mono text-xs text-slate-900 dark:text-white truncate">
                      {job.sourceHost} <span className="text-slate-400">→</span> {job.destHost}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden max-w-sm">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: pct !== null ? `${pct}%` : "30%" }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 font-mono">
                    {formatBytes(job.bytesTransferred)}
                    {job.totalBytes ? ` / ${formatBytes(job.totalBytes)} (${pct}%)` : ""}
                  </p>
                  {(job.bytesPerSecond || etaSeconds !== null) && (
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {job.bytesPerSecond ? `${formatBytes(job.bytesPerSecond)}/s` : ""}
                      {job.bytesPerSecond && etaSeconds !== null ? " · " : ""}
                      {etaSeconds !== null ? `~${formatDuration(etaSeconds)} remaining` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 className="w-6 h-6 text-primary-light animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <ArrowUpDown className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-900 dark:text-white font-medium mb-1">
            {filter === "all" ? "No transfers yet" : `No ${STATUS_LABEL[filter].toLowerCase()} transfers`}
          </p>
          {filter === "all" && (
            <>
              <p className="text-slate-500 text-sm mb-5">Each transfer you run will appear here.</p>
              <Link
                href="/dashboard/transfer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" /> Start a transfer
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Route</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Size</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900 dark:text-white font-mono text-xs truncate max-w-[200px]">
                      {t.source_host}
                    </p>
                    <p className="text-slate-500 font-mono text-xs truncate max-w-[200px]">
                      {t.source_path}
                    </p>
                    <p className="text-slate-400 font-mono text-xs mt-1">
                      → <span className="text-slate-500">{t.dest_host}</span>
                    </p>
                    {t.status === "failed" && t.error && (
                      <p className="text-red-500 text-xs mt-1 max-w-[260px] truncate">{t.error}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                    {t.bytes > 0 ? formatBytes(t.bytes) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {t.status === "success" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : t.status === "in_progress" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> In Progress
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs hidden md:table-cell">
                    <p>{new Date(t.created_at).toLocaleDateString()}</p>
                    <p className="text-slate-400">{new Date(t.created_at).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {t.status === "failed" && t.source && t.destination && (
                      <button
                        onClick={() => handleRetry(t)}
                        disabled={retryingId === t.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-light hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Retry this transfer"
                      >
                        {retryingId === t.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCw className="w-3.5 h-3.5" />
                        )}
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
