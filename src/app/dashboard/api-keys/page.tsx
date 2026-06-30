"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import type { ApiKey } from "@/lib/wordpress";

const inputClass =
  "w-full px-4 py-2.5 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-sm";

function NewKeyModal({ onCreated, onClose }: { onCreated: (key: ApiKey, full: string) => void; onClose: () => void }) {
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.fullKey) {
      onCreated(data.apiKey, data.fullKey);
    } else {
      setError(data.error || "Failed to create key.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 dark:text-white text-lg">New API Key</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. CI/CD Pipeline" className={inputClass} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RevealedKeyBanner({ fullKey, onDismiss }: { fullKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(fullKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/10 p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Copy this key now — it won&apos;t be shown again.
        </div>
        <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 shrink-0"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center gap-2 bg-white dark:bg-surface rounded-xl border border-amber-200 dark:border-amber-800 px-3 py-2">
        <code className="flex-1 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{fullKey}</code>
        <button onClick={copy} className="shrink-0 text-slate-400 hover:text-primary-light transition-colors">
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ key: ApiKey; full: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.apiKeys ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (key: ApiKey, full: string) => {
    setKeys((prev) => [...prev, key]);
    setRevealedKey({ key, full });
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" }).catch(() => {});
    setKeys((prev) => prev.filter((k) => k.id !== id));
    if (revealedKey?.key.id === id) setRevealedKey(null);
    setDeletingId(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API Keys</h1>
          <p className="text-slate-500 text-sm mt-1">Use these keys to authenticate programmatic transfers.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Key
        </button>
      </div>

      {revealedKey && (
        <RevealedKeyBanner
          fullKey={revealedKey.full}
          onDismiss={() => setRevealedKey(null)}
        />
      )}

      <div className="glass-card rounded-2xl p-5 mb-6 text-sm text-slate-600 dark:text-slate-400 space-y-1">
        <p className="font-medium text-slate-900 dark:text-white mb-2">Usage</p>
        <p>Pass your API key in the <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header:</p>
        <div className="bg-slate-900 dark:bg-black rounded-xl px-4 py-3 font-mono text-xs text-emerald-400 mt-2">
          Authorization: Bearer airftp_live_…
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center"><Loader2 className="w-6 h-6 text-primary-light animate-spin mx-auto" /></div>
      ) : keys.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Key className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-900 dark:text-white font-medium mb-1">No API keys yet</p>
          <p className="text-slate-500 text-sm mb-5">Generate a key to authenticate API requests.</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Generate your first key
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Label</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Key</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Created</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{k.label}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{k.prefix}••••••••••••</td>
                  <td className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(k.id)}
                      disabled={deletingId === k.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {deletingId === k.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <NewKeyModal onCreated={handleCreated} onClose={() => setShowModal(false)} />}
    </div>
  );
}
