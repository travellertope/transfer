"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  HardDrive,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import type { SavedConnection } from "@/lib/wordpress";

const inputClass =
  "w-full px-4 py-2.5 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-sm";

type FormData = Omit<SavedConnection, "id"> & { password: string };

const emptyForm: FormData = {
  label: "", protocol: "ftp", host: "", user: "", password: "", path: "",
};

function ServerModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: SavedConnection;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    initial ? { ...initial, password: "" } : emptyForm
  );
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.label || !form.host || !form.user || !form.path) {
      setError("Label, host, username, and path are required.");
      return;
    }
    if (!initial && !form.password) {
      setError("Password is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {initial ? "Edit Server" : "Add Server"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Label</label>
            <input value={form.label} onChange={set("label")} placeholder="Production" className={inputClass} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Protocol</label>
              <select
                value={form.protocol}
                onChange={(e) =>
                  setForm((f) => ({ ...f, protocol: e.target.value as "ftp" | "sftp" }))
                }
                className={inputClass}
              >
                <option value="ftp">FTP</option>
                <option value="sftp">SFTP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Port</label>
              <input
                value={form.port ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, port: e.target.value ? Number(e.target.value) : undefined }))
                }
                placeholder={form.protocol === "sftp" ? "22" : "21"}
                inputMode="numeric"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              {form.protocol === "sftp" ? "SFTP Host" : "FTP Host"}
            </label>
            <input value={form.host} onChange={set("host")} placeholder={form.protocol === "sftp" ? "sftp.example.com" : "ftp.example.com"} className={inputClass} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Username</label>
              <input value={form.user} onChange={set("user")} placeholder="ftp_user" className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Password{initial && <span className="text-slate-400"> (leave blank to keep)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className={`${inputClass} pr-9`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Default Path</label>
            <input value={form.path} onChange={set("path")} placeholder="/public_html/" className={inputClass} required />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initial ? "Save changes" : "Add server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServersPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SavedConnection | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveError, setGdriveError] = useState("");

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get("gdrive_connected")) setGdriveConnected(true);
    if (params.get("gdrive_error")) setGdriveError(params.get("gdrive_error") || "Failed to connect Google Drive.");
    if (params.has("gdrive_connected") || params.has("gdrive_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const openAdd = () => { setEditing(undefined); setShowModal(true); };
  const openEdit = (c: SavedConnection) => { setEditing(c); setShowModal(true); };

  const handleSave = async (data: FormData & { label: string }) => {
    if (editing) {
      const res = await fetch(`/api/connections/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Update failed.");
      }
      const { connection } = await res.json();
      setConnections((prev) => prev.map((c) => (c.id === editing.id ? connection : c)));
      setJustSaved(editing.id);
    } else {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Add failed.");
      }
      const { connection } = await res.json();
      setConnections((prev) => [...prev, connection]);
      setJustSaved(connection.id);
    }
    setShowModal(false);
    setTimeout(() => setJustSaved(null), 2000);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/connections/${id}`, { method: "DELETE" }).catch(() => {});
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Saved Servers</h1>
          <p className="text-slate-500 text-sm mt-1">Credentials are encrypted at rest.</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.isPro ? (
            <a
              href="/api/oauth/google/start"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:border-primary/50 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            >
              <HardDrive className="w-4 h-4" /> Connect Google Drive
            </a>
          ) : (
            <Link
              href="/#pricing"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-400 text-sm font-semibold rounded-xl transition-colors"
              title="Google Drive is a Pro feature"
            >
              <HardDrive className="w-4 h-4" /> Connect Google Drive (Pro)
            </Link>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Server
          </button>
        </div>
      </div>

      {gdriveConnected && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mb-4">
          <CheckCircle2 className="w-4 h-4" /> Google Drive connected.
        </div>
      )}
      {gdriveError && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{gdriveError === "pro_required" ? "Google Drive is a Pro feature — upgrade to connect an account." : gdriveError}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 className="w-6 h-6 text-primary-light animate-spin mx-auto" />
        </div>
      ) : connections.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Server className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-900 dark:text-white font-medium mb-1">No saved servers</p>
          <p className="text-slate-500 text-sm mb-5">Save an FTP server to reuse it on future transfers.</p>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add your first server
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Label</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Host</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Path</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {connections.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/20 text-primary-light">
                        {c.protocol === "gdrive" ? <HardDrive className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {c.label}
                        {justSaved === c.id && (
                          <span className="ml-2 inline-flex items-center gap-1 text-emerald-500 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Saved
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs hidden sm:table-cell">
                    <span className="uppercase text-[10px] font-semibold text-primary-light mr-1.5">
                      {c.protocol === "gdrive" ? "DRIVE" : c.protocol === "sftp" ? "SFTP" : "FTP"}
                    </span>
                    {c.protocol === "gdrive" ? c.host : `${c.host}${c.port ? `:${c.port}` : ""}`}
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs hidden md:table-cell">
                    {c.protocol === "gdrive" ? "Chosen per transfer" : c.path}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.protocol !== "gdrive" && (
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-primary-light rounded-lg hover:bg-primary/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        {deletingId === c.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ServerModal
          initial={editing}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
