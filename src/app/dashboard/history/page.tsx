"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowUpDown } from "lucide-react";
import type { TransferRecord } from "@/lib/wordpress";
import { formatBytes } from "@/lib/limits";

export default function HistoryPage() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setTransfers(d.transfers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? transfers : transfers.filter((t) => t.status === filter);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer History</h1>
          <p className="text-slate-500 text-sm mt-1">Last {transfers.length} transfers stored.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "success", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary/10 text-primary-light"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 className="w-6 h-6 text-primary-light animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <ArrowUpDown className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-900 dark:text-white font-medium mb-1">
            {filter === "all" ? "No transfers yet" : `No ${filter} transfers`}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
