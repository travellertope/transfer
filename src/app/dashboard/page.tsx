"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Server,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import type { TransferRecord } from "@/lib/wordpress";
import { formatBytes } from "@/lib/limits";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      const res = await fetch("/api/history");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't load your transfer history.");
      setTransfers(d.transfers ?? []);
    };
    const loadConnections = async () => {
      const res = await fetch("/api/connections");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't load your saved servers.");
      setServerCount((d.connections ?? []).length);
    };

    Promise.all([loadHistory(), loadConnections()])
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Couldn't load your dashboard data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const successful = transfers.filter((t) => t.status === "success");
  const totalBytes = successful.reduce((sum, t) => sum + (t.bytes ?? 0), 0);
  const recent = transfers.slice(0, 5);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {user?.isPro ? "Pro plan" : "Free plan · "}
          {!user?.isPro && (
            <Link href="/#pricing" className="text-primary-light hover:underline">
              Upgrade to Pro
            </Link>
          )}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Transfers"
          value={loading ? "—" : transfers.length}
          icon={ArrowUpDown}
          iconColor="bg-primary/10 text-primary-light"
        />
        <StatCard
          label="Successful"
          value={loading ? "—" : successful.length}
          icon={CheckCircle2}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Data Moved"
          value={loading ? "—" : formatBytes(totalBytes)}
          icon={Zap}
          iconColor="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          label="Saved Servers"
          value={loading ? "—" : serverCount}
          icon={Server}
          iconColor="bg-blue-500/10 text-blue-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/transfer"
          className="flex items-center justify-between p-5 glass-card rounded-2xl hover:border-primary/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowUpDown className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">New Transfer</p>
              <p className="text-xs text-slate-500">Move a file between servers</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-light transition-colors" />
        </Link>

        <Link
          href="/dashboard/servers"
          className="flex items-center justify-between p-5 glass-card rounded-2xl hover:border-primary/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Manage Servers</p>
              <p className="text-xs text-slate-500">Add, edit or remove saved servers</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-light transition-colors" />
        </Link>
      </div>

      {/* Recent transfers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Transfers</h2>
          {transfers.length > 5 && (
            <Link href="/dashboard/history" className="text-sm text-primary-light hover:underline">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-slate-500 text-sm mb-4">No transfers yet.</p>
            <Link
              href="/dashboard/transfer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" /> Start your first transfer
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Route
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                    Size
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {recent.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                        {t.source_host}
                      </p>
                      <p className="font-mono text-xs text-slate-500 truncate max-w-[180px]">
                        → {t.dest_host}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                      {t.bytes > 0 ? formatBytes(t.bytes) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
