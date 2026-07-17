"use client";

import { useEffect, useState } from "react";
import { Webhook as WebhookIcon, Plus, Pencil, Trash2, X, Loader2, CheckCircle2 } from "lucide-react";
import type { Webhook } from "@/lib/wordpress";

const inputClass =
  "w-full px-4 py-2.5 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-sm";

const ALL_EVENTS = ["transfer.success", "transfer.failed"] as const;

type WebhookForm = Omit<Webhook, "id" | "created_at">;
const emptyForm: WebhookForm = { label: "", url: "", events: ["transfer.success", "transfer.failed"], active: true };

function WebhookModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Webhook;
  onSave: (data: WebhookForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<WebhookForm>(
    initial ? { label: initial.label, url: initial.url, events: initial.events, active: initial.active } : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.events.length === 0) { setError("Select at least one event."); return; }
    setSaving(true);
    try { await onSave(form); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 dark:text-white text-lg">{initial ? "Edit Webhook" : "Add Webhook"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Label</label>
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Slack notifications" className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Endpoint URL</label>
            <input type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://your-server.com/webhook" className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Events</label>
            <div className="space-y-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-primary" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Active</span>
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {initial ? "Save" : "Add Webhook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Webhook | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((d) => setWebhooks(d.webhooks ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (data: WebhookForm) => {
    if (editing) {
      const res = await fetch(`/api/webhooks/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed.");
      const { webhook } = await res.json();
      setWebhooks((prev) => prev.map((w) => (w.id === editing.id ? webhook : w)));
      setJustSaved(webhook.id);
    } else {
      const res = await fetch("/api/webhooks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Create failed.");
      const { webhook } = await res.json();
      setWebhooks((prev) => [...prev, webhook]);
      setJustSaved(webhook.id);
    }
    setShowModal(false);
    setEditing(undefined);
    setTimeout(() => setJustSaved(null), 2000);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" }).catch(() => {});
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks</h1>
          <p className="text-slate-500 text-sm mt-1">Get notified at your endpoint when transfers complete or fail.</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {/* Payload example */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">Payload format</p>
        <pre className="bg-slate-900 dark:bg-black rounded-xl p-4 text-xs text-emerald-400 font-mono overflow-x-auto">{`{
  "event": "transfer.success",
  "transfer": {
    "id": "uuid",
    "source_host": "ftp.example.com",
    "dest_host": "ftp.dest.com",
    "bytes": 52428800,
    "created_at": "2026-06-30T12:00:00Z"
  }
}`}</pre>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center"><Loader2 className="w-6 h-6 text-primary-light animate-spin mx-auto" /></div>
      ) : webhooks.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <WebhookIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-900 dark:text-white font-medium mb-1">No webhooks configured</p>
          <p className="text-slate-500 text-sm mb-5">Add an endpoint to receive real-time transfer events.</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${w.active ? "bg-emerald-400" : "bg-slate-400"}`} title={w.active ? "Active" : "Inactive"} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{w.label}</p>
                  {justSaved === w.id && (
                    <span className="inline-flex items-center gap-1 text-emerald-500 text-xs shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{w.url}</p>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {w.events.map((ev) => (
                    <span key={ev} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditing(w); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-primary-light rounded-lg hover:bg-primary/10 transition-colors" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(w.id)} disabled={deletingId === w.id} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  {deletingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <WebhookModal initial={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </div>
  );
}
