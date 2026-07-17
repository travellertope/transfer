"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Server,
  ArrowRightLeft,
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  Trash2,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTransferJob } from "./useTransferJob";
import { TransferStatusCard } from "./TransferStatusCard";
import type { SavedConnection } from "@/lib/wordpress";

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
        className="w-full px-4 py-3 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 pr-10"
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

export default function TransferForm() {
  const { user, isLoading: authLoading } = useAuth();

  const [sourceProtocol, setSourceProtocol] = useState<"ftp" | "sftp">("ftp");
  const [sourceHost, setSourceHost] = useState("");
  const [sourcePort, setSourcePort] = useState("");
  const [sourceUser, setSourceUser] = useState("");
  const [sourcePass, setSourcePass] = useState("");
  const [sourcePath, setSourcePath] = useState("");

  const [destProtocol, setDestProtocol] = useState<"ftp" | "sftp">("ftp");
  const [destHost, setDestHost] = useState("");
  const [destPort, setDestPort] = useState("");
  const [destUser, setDestUser] = useState("");
  const [destPass, setDestPass] = useState("");
  const [destPath, setDestPath] = useState("");

  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [sourceSavedId, setSourceSavedId] = useState("");
  const [destSavedId, setDestSavedId] = useState("");
  const [saveSource, setSaveSource] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("");
  const [saveDest, setSaveDest] = useState(false);
  const [destLabel, setDestLabel] = useState("");

  const { state: transfer, start, cancel } = useTransferJob();

  useEffect(() => {
    if (!user) {
      setConnections([]);
      return;
    }
    fetch("/api/connections")
      .then((res) => res.json())
      .then((data) => setConnections(data.connections ?? []))
      .catch(() => {});
  }, [user]);

  const applySaved = (panel: "source" | "destination", id: string) => {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;
    if (panel === "source") {
      setSourceProtocol(conn.protocol ?? "ftp");
      setSourceHost(conn.host);
      setSourcePort(conn.port ? String(conn.port) : "");
      setSourceUser(conn.user);
      setSourcePass(conn.password);
      setSourcePath(conn.path);
    } else {
      setDestProtocol(conn.protocol ?? "ftp");
      setDestHost(conn.host);
      setDestPort(conn.port ? String(conn.port) : "");
      setDestUser(conn.user);
      setDestPass(conn.password);
      setDestPath(conn.path);
    }
  };

  const deleteSaved = async (panel: "source" | "destination", id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (panel === "source") setSourceSavedId("");
    else setDestSavedId("");
    try {
      await fetch(`/api/connections/${id}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  };

  const saveServer = async (
    label: string,
    protocol: "ftp" | "sftp",
    host: string,
    port: string,
    user: string,
    password: string,
    path: string
  ) => {
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          protocol,
          host,
          port: port ? Number(port) : undefined,
          user,
          password,
          path,
        }),
      });
      const data = await res.json();
      if (data.connection) {
        setConnections((prev) => [...prev, data.connection]);
      }
    } catch {
      /* best effort */
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saveSource && sourceLabel) {
      saveServer(sourceLabel, sourceProtocol, sourceHost, sourcePort, sourceUser, sourcePass, sourcePath);
      setSaveSource(false);
      setSourceLabel("");
    }
    if (saveDest && destLabel) {
      saveServer(destLabel, destProtocol, destHost, destPort, destUser, destPass, destPath);
      setSaveDest(false);
      setDestLabel("");
    }

    start(
      {
        protocol: sourceProtocol,
        host: sourceHost,
        port: sourcePort ? Number(sourcePort) : undefined,
        user: sourceUser,
        password: sourcePass,
        path: sourcePath,
      },
      {
        protocol: destProtocol,
        host: destHost,
        port: destPort ? Number(destPort) : undefined,
        user: destUser,
        password: destPass,
        path: destPath,
      }
    );
  };

  const inputClass =
    "w-full px-4 py-3 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30";

  return (
    <section id="transfer" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Start a <span className="gradient-text">Transfer</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Enter the FTP credentials for both servers. We connect, stream, and
            confirm. Optionally save a server to reuse it on future transfers
            — saved credentials are encrypted at rest.
          </p>
        </div>

        {!authLoading && !user && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <LogIn className="w-8 h-8 text-primary-light mx-auto mb-3" />
            <p className="text-slate-900 dark:text-white font-medium mb-1">
              Log in to start a transfer
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              AirFTP requires a free account to run transfers.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 hover:border-primary/50 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {!authLoading && user && (
        <form onSubmit={handleTransfer}>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Source Server */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Source Server
                  </h3>
                  <p className="text-xs text-slate-500">Copy FROM here</p>
                </div>
              </div>

              <div className="space-y-4">
                {connections.length > 0 && (
                  <div>
                    <label
                      htmlFor="srcSaved"
                      className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Saved Servers
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="srcSaved"
                        value={sourceSavedId}
                        onChange={(e) => {
                          setSourceSavedId(e.target.value);
                          if (e.target.value) applySaved("source", e.target.value);
                        }}
                        className={inputClass}
                      >
                        <option value="">Enter manually...</option>
                        {connections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {sourceSavedId && (
                        <button
                          type="button"
                          onClick={() => deleteSaved("source", sourceSavedId)}
                          className="shrink-0 text-slate-500 hover:text-red-500"
                          title="Remove saved server"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="srcProtocol"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Protocol
                  </label>
                  <select
                    id="srcProtocol"
                    value={sourceProtocol}
                    onChange={(e) => setSourceProtocol(e.target.value as "ftp" | "sftp")}
                    className={inputClass}
                  >
                    <option value="ftp">FTP</option>
                    <option value="sftp">SFTP</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label
                      htmlFor="srcHost"
                      className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                    >
                      {sourceProtocol === "sftp" ? "SFTP Host" : "FTP Host"}
                    </label>
                    <input
                      id="srcHost"
                      type="text"
                      value={sourceHost}
                      onChange={(e) => setSourceHost(e.target.value)}
                      placeholder={sourceProtocol === "sftp" ? "sftp.source-server.com" : "ftp.source-server.com"}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="srcPort"
                      className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Port
                    </label>
                    <input
                      id="srcPort"
                      type="text"
                      inputMode="numeric"
                      value={sourcePort}
                      onChange={(e) => setSourcePort(e.target.value)}
                      placeholder={sourceProtocol === "sftp" ? "22" : "21"}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="srcUser"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Username
                  </label>
                  <input
                    id="srcUser"
                    type="text"
                    value={sourceUser}
                    onChange={(e) => setSourceUser(e.target.value)}
                    placeholder="ftp_username"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="srcPass"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="srcPass"
                    value={sourcePass}
                    onChange={setSourcePass}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label
                    htmlFor="srcPath"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    File Path
                  </label>
                  <input
                    id="srcPath"
                    type="text"
                    value={sourcePath}
                    onChange={(e) => setSourcePath(e.target.value)}
                    placeholder="/public_html/backups/archive.tar.gz"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="saveSource"
                    type="checkbox"
                    checked={saveSource}
                    onChange={(e) => setSaveSource(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="saveSource" className="text-sm text-slate-600 dark:text-slate-400">
                    Save this server for next time
                  </label>
                </div>
                {saveSource && (
                  <input
                    type="text"
                    value={sourceLabel}
                    onChange={(e) => setSourceLabel(e.target.value)}
                    placeholder="Label (e.g. Production Backup)"
                    className={inputClass}
                  />
                )}
              </div>
            </div>

            {/* Destination Server */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Destination Server
                  </h3>
                  <p className="text-xs text-slate-500">Send TO here</p>
                </div>
              </div>

              <div className="space-y-4">
                {connections.length > 0 && (
                  <div>
                    <label
                      htmlFor="dstSaved"
                      className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Saved Servers
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="dstSaved"
                        value={destSavedId}
                        onChange={(e) => {
                          setDestSavedId(e.target.value);
                          if (e.target.value) applySaved("destination", e.target.value);
                        }}
                        className={inputClass}
                      >
                        <option value="">Enter manually...</option>
                        {connections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {destSavedId && (
                        <button
                          type="button"
                          onClick={() => deleteSaved("destination", destSavedId)}
                          className="shrink-0 text-slate-500 hover:text-red-500"
                          title="Remove saved server"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="dstProtocol"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Protocol
                  </label>
                  <select
                    id="dstProtocol"
                    value={destProtocol}
                    onChange={(e) => setDestProtocol(e.target.value as "ftp" | "sftp")}
                    className={inputClass}
                  >
                    <option value="ftp">FTP</option>
                    <option value="sftp">SFTP</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label
                      htmlFor="dstHost"
                      className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                    >
                      {destProtocol === "sftp" ? "SFTP Host" : "FTP Host"}
                    </label>
                    <input
                      id="dstHost"
                      type="text"
                      value={destHost}
                      onChange={(e) => setDestHost(e.target.value)}
                      placeholder={destProtocol === "sftp" ? "sftp.destination-server.com" : "ftp.destination-server.com"}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dstPort"
                      className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Port
                    </label>
                    <input
                      id="dstPort"
                      type="text"
                      inputMode="numeric"
                      value={destPort}
                      onChange={(e) => setDestPort(e.target.value)}
                      placeholder={destProtocol === "sftp" ? "22" : "21"}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="dstUser"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Username
                  </label>
                  <input
                    id="dstUser"
                    type="text"
                    value={destUser}
                    onChange={(e) => setDestUser(e.target.value)}
                    placeholder="ftp_username"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="dstPass"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="dstPass"
                    value={destPass}
                    onChange={setDestPass}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dstPath"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Destination Path
                  </label>
                  <input
                    id="dstPath"
                    type="text"
                    value={destPath}
                    onChange={(e) => setDestPath(e.target.value)}
                    placeholder="/backups/archive.tar.gz"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="saveDest"
                    type="checkbox"
                    checked={saveDest}
                    onChange={(e) => setSaveDest(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="saveDest" className="text-sm text-slate-600 dark:text-slate-400">
                    Save this server for next time
                  </label>
                </div>
                {saveDest && (
                  <input
                    type="text"
                    value={destLabel}
                    onChange={(e) => setDestLabel(e.target.value)}
                    placeholder="Label (e.g. CDN Origin)"
                    className={inputClass}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Transfer Arrow + Button */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <button
              type="submit"
              disabled={transfer.status === "transferring"}
              className="group flex items-center gap-3 px-10 py-4 bg-primary hover:bg-primary-dark disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-lg"
            >
              {transfer.status === "transferring" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-5 h-5" />
                  Start Transfer
                </>
              )}
            </button>
            <p className="text-xs text-slate-500">
              {user?.isPro ? "Pro: up to 10GB per file" : "Free: up to 800MB per file"}
            </p>
          </div>
        </form>
        )}

        <TransferStatusCard transfer={transfer} onCancel={cancel} upgradeHref="#pricing" />
      </div>
    </section>
  );
}
