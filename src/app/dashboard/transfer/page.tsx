"use client";

import { useEffect, useState } from "react";
import {
  Server,
  ArrowRightLeft,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useTransferJob } from "@/components/useTransferJob";
import { TransferStatusCard } from "@/components/TransferStatusCard";
import type { SavedConnection } from "@/lib/wordpress";

const inputClass =
  "w-full px-4 py-3 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-sm";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface ServerPanelProps {
  title: string;
  subtitle: string;
  iconColor: string;
  savedConnections: SavedConnection[];
  savedId: string;
  onSavedChange: (id: string) => void;
  onDeleteSaved: (id: string) => void;
  protocol: "ftp" | "sftp"; setProtocol: (v: "ftp" | "sftp") => void;
  host: string; setHost: (v: string) => void;
  port: string; setPort: (v: string) => void;
  user: string; setUser: (v: string) => void;
  pass: string; setPass: (v: string) => void;
  path: string; setPath: (v: string) => void;
  pathPlaceholder: string;
  save: boolean; setSave: (v: boolean) => void;
  label: string; setLabel: (v: string) => void;
  idPrefix: string;
}

function ServerPanel({
  title, subtitle, iconColor, savedConnections, savedId,
  onSavedChange, onDeleteSaved, protocol, setProtocol, host, setHost, port, setPort, user, setUser,
  pass, setPass, path, setPath, pathPlaceholder,
  save, setSave, label, setLabel, idPrefix,
}: ServerPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        {savedConnections.length > 0 && (
          <div>
            <label htmlFor={`${idPrefix}-saved`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              Saved Servers
            </label>
            <div className="flex items-center gap-2">
              <select
                id={`${idPrefix}-saved`}
                value={savedId}
                onChange={(e) => onSavedChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Enter manually…</option>
                {savedConnections.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {savedId && (
                <button type="button" onClick={() => onDeleteSaved(savedId)} className="shrink-0 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`${idPrefix}-protocol`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Protocol</label>
          <select
            id={`${idPrefix}-protocol`}
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as "ftp" | "sftp")}
            className={inputClass}
          >
            <option value="ftp">FTP</option>
            <option value="sftp">SFTP</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label htmlFor={`${idPrefix}-host`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
              {protocol === "sftp" ? "SFTP Host" : "FTP Host"}
            </label>
            <input
              id={`${idPrefix}-host`}
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={protocol === "sftp" ? "sftp.example.com" : "ftp.example.com"}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-port`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Port</label>
            <input
              id={`${idPrefix}-port`}
              type="text"
              inputMode="numeric"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder={protocol === "sftp" ? "22" : "21"}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-user`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Username</label>
          <input id={`${idPrefix}-user`} type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="ftp_username" className={inputClass} required />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-pass`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Password</label>
          <PasswordInput id={`${idPrefix}-pass`} value={pass} onChange={setPass} placeholder="••••••••" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-path`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">File Path</label>
          <input id={`${idPrefix}-path`} type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder={pathPlaceholder} className={inputClass} required />
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Save this server</span>
          </label>
          {save && (
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Production)" className={inputClass} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransferPage() {
  const { user } = useAuth();

  const [srcProtocol, setSrcProtocol] = useState<"ftp" | "sftp">("ftp");
  const [srcHost, setSrcHost] = useState("");
  const [srcPort, setSrcPort] = useState("");
  const [srcUser, setSrcUser] = useState("");
  const [srcPass, setSrcPass] = useState("");
  const [srcPath, setSrcPath] = useState("");
  const [dstProtocol, setDstProtocol] = useState<"ftp" | "sftp">("ftp");
  const [dstHost, setDstHost] = useState("");
  const [dstPort, setDstPort] = useState("");
  const [dstUser, setDstUser] = useState("");
  const [dstPass, setDstPass] = useState("");
  const [dstPath, setDstPath] = useState("");

  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [srcSavedId, setSrcSavedId] = useState("");
  const [dstSavedId, setDstSavedId] = useState("");
  const [saveSource, setSaveSource] = useState(false);
  const [srcLabel, setSrcLabel] = useState("");
  const [saveDest, setSaveDest] = useState(false);
  const [dstLabel, setDstLabel] = useState("");

  const { state: transfer, start, cancel } = useTransferJob();

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
      .catch(() => {});
  }, []);

  const applySaved = (role: "source" | "destination", id: string) => {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;
    if (role === "source") {
      setSrcProtocol(conn.protocol ?? "ftp"); setSrcHost(conn.host); setSrcPort(conn.port ? String(conn.port) : "");
      setSrcUser(conn.user); setSrcPass(conn.password); setSrcPath(conn.path);
    } else {
      setDstProtocol(conn.protocol ?? "ftp"); setDstHost(conn.host); setDstPort(conn.port ? String(conn.port) : "");
      setDstUser(conn.user); setDstPass(conn.password); setDstPath(conn.path);
    }
  };

  const deleteSaved = async (role: "source" | "destination", id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (role === "source") setSrcSavedId(""); else setDstSavedId("");
    await fetch(`/api/connections/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const saveServer = async (
    role: "source" | "destination",
    lbl: string,
    protocol: "ftp" | "sftp",
    host: string,
    prt: string,
    u: string,
    p: string,
    pth: string
  ) => {
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: lbl,
        role,
        protocol,
        host,
        port: prt ? Number(prt) : undefined,
        user: u,
        password: p,
        path: pth,
      }),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      if (d.connection) setConnections((prev) => [...prev, d.connection]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saveSource && srcLabel) {
      saveServer("source", srcLabel, srcProtocol, srcHost, srcPort, srcUser, srcPass, srcPath);
      setSaveSource(false); setSrcLabel("");
    }
    if (saveDest && dstLabel) {
      saveServer("destination", dstLabel, dstProtocol, dstHost, dstPort, dstUser, dstPass, dstPath);
      setSaveDest(false); setDstLabel("");
    }

    start(
      {
        protocol: srcProtocol,
        host: srcHost,
        port: srcPort ? Number(srcPort) : undefined,
        user: srcUser,
        password: srcPass,
        path: srcPath,
      },
      {
        protocol: dstProtocol,
        host: dstHost,
        port: dstPort ? Number(dstPort) : undefined,
        user: dstUser,
        password: dstPass,
        path: dstPath,
      }
    );
  };

  const srcConnections = connections.filter((c) => c.role === "source");
  const dstConnections = connections.filter((c) => c.role === "destination");

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Transfer</h1>
        <p className="text-slate-500 text-sm mt-1">
          {user?.isPro ? "Pro: up to 10GB per file" : "Free: up to 800MB per file · "}
          {!user?.isPro && (
            <Link href="/#pricing" className="text-primary-light hover:underline">Upgrade</Link>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <ServerPanel
            title="Source Server" subtitle="Copy FROM here"
            iconColor="bg-emerald-500/20 text-emerald-400"
            savedConnections={srcConnections}
            savedId={srcSavedId}
            onSavedChange={(id) => { setSrcSavedId(id); if (id) applySaved("source", id); }}
            onDeleteSaved={(id) => deleteSaved("source", id)}
            protocol={srcProtocol} setProtocol={setSrcProtocol}
            host={srcHost} setHost={setSrcHost}
            port={srcPort} setPort={setSrcPort}
            user={srcUser} setUser={setSrcUser}
            pass={srcPass} setPass={setSrcPass}
            path={srcPath} setPath={setSrcPath}
            pathPlaceholder="/public_html/backups/archive.tar.gz"
            save={saveSource} setSave={setSaveSource}
            label={srcLabel} setLabel={setSrcLabel}
            idPrefix="src"
          />
          <ServerPanel
            title="Destination Server" subtitle="Send TO here"
            iconColor="bg-blue-500/20 text-blue-400"
            savedConnections={dstConnections}
            savedId={dstSavedId}
            onSavedChange={(id) => { setDstSavedId(id); if (id) applySaved("destination", id); }}
            onDeleteSaved={(id) => deleteSaved("destination", id)}
            protocol={dstProtocol} setProtocol={setDstProtocol}
            host={dstHost} setHost={setDstHost}
            port={dstPort} setPort={setDstPort}
            user={dstUser} setUser={setDstUser}
            pass={dstPass} setPass={setDstPass}
            path={dstPath} setPath={setDstPath}
            pathPlaceholder="/backups/archive.tar.gz"
            save={saveDest} setSave={setSaveDest}
            label={dstLabel} setLabel={setDstLabel}
            idPrefix="dst"
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={transfer.status === "transferring"}
            className="flex items-center gap-3 px-10 py-4 bg-primary hover:bg-primary-dark disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-base"
          >
            {transfer.status === "transferring" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Transferring…</>
            ) : (
              <><ArrowRightLeft className="w-5 h-5" /> Start Transfer</>
            )}
          </button>
        </div>
      </form>

      <TransferStatusCard transfer={transfer} onCancel={cancel} upgradeHref="/#pricing" />
    </div>
  );
}
