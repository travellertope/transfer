"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatBytes, formatDuration, estimateSecondsRemaining } from "@/lib/limits";
import type { TransferUiState } from "./useTransferJob";

export function TransferStatusCard({
  transfer,
  onCancel,
  upgradeHref,
}: {
  transfer: TransferUiState;
  onCancel: () => void;
  upgradeHref: string;
}) {
  if (transfer.status === "idle") {
    return null;
  }

  if (transfer.status === "transferring") {
    const pct =
      transfer.totalBytes && transfer.totalBytes > 0
        ? Math.min(100, Math.round(((transfer.bytesTransferred ?? 0) / transfer.totalBytes) * 100))
        : null;
    const etaSeconds = estimateSecondsRemaining(
      transfer.bytesTransferred ?? 0,
      transfer.totalBytes ?? null,
      transfer.bytesPerSecond ?? null
    );

    return (
      <div className="glass-card rounded-2xl p-6 text-center mt-6">
        <Loader2 className="w-8 h-8 text-primary-light animate-spin mx-auto mb-3" />
        <p className="text-slate-900 dark:text-white font-medium mb-1">Transfer in Progress</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{transfer.message}</p>

        {pct !== null ? (
          <div className="max-w-sm mx-auto">
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              {formatBytes(transfer.bytesTransferred ?? 0)} / {formatBytes(transfer.totalBytes ?? 0)} ({pct}%)
            </p>
          </div>
        ) : transfer.bytesTransferred ? (
          <p className="text-xs text-slate-500 font-mono">{formatBytes(transfer.bytesTransferred)} transferred</p>
        ) : null}

        {(transfer.bytesPerSecond || etaSeconds !== null) && (
          <p className="text-xs text-slate-500 mt-1.5 font-mono">
            {transfer.bytesPerSecond ? `${formatBytes(transfer.bytesPerSecond)}/s` : ""}
            {transfer.bytesPerSecond && etaSeconds !== null ? " · " : ""}
            {etaSeconds !== null ? `~${formatDuration(etaSeconds)} remaining` : ""}
          </p>
        )}

        <p className="text-xs text-slate-500 mt-4 max-w-sm mx-auto">
          This keeps running on our servers even if you close this tab or lose your connection.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-sm text-red-500 hover:text-red-600 hover:underline"
        >
          Cancel transfer
        </button>
      </div>
    );
  }

  if (transfer.status === "success") {
    return (
      <div className="glass-card rounded-2xl p-6 text-center mt-6 border-emerald-500/30">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <p className="text-slate-900 dark:text-white font-medium mb-1">Transfer Complete</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{transfer.message}</p>
        {transfer.bytesTransferred ? (
          <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400">
            {formatBytes(transfer.bytesTransferred)} transferred
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 text-center mt-6 border-red-500/30">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-slate-900 dark:text-white font-medium mb-1">Transfer Failed</p>
      <p className="text-sm text-red-600 dark:text-red-300 mb-2">{transfer.message}</p>
      {transfer.limitExceeded && (
        <a href={upgradeHref} className="text-sm text-primary-light hover:underline">
          Upgrade to Pro for 10GB transfers →
        </a>
      )}
    </div>
  );
}
