"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Loader2, LogIn } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTransferJob } from "./useTransferJob";
import { TransferStatusCard } from "./TransferStatusCard";
import { ServerFieldsPanel } from "./ServerFieldsPanel";
import type { SavedConnection } from "@/lib/wordpress";
import type { Protocol } from "@/lib/transferClients";

export default function TransferForm() {
  const { user, isLoading: authLoading } = useAuth();

  const [sourceProtocol, setSourceProtocol] = useState<Protocol>("ftp");
  const [sourceHost, setSourceHost] = useState("");
  const [sourcePort, setSourcePort] = useState("");
  const [sourceUser, setSourceUser] = useState("");
  const [sourcePass, setSourcePass] = useState("");
  const [sourcePath, setSourcePath] = useState("");

  const [destProtocol, setDestProtocol] = useState<Protocol>("ftp");
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
  const [sourceSaveStatus, setSourceSaveStatus] = useState<"success" | "error" | undefined>();
  const [destSaveStatus, setDestSaveStatus] = useState<"success" | "error" | undefined>();

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
    const path = conn.protocol === "gdrive" ? "" : conn.path;
    if (panel === "source") {
      setSourceProtocol(conn.protocol ?? "ftp");
      setSourceHost(conn.host);
      setSourcePort(conn.port ? String(conn.port) : "");
      setSourceUser(conn.user);
      setSourcePass(conn.password);
      setSourcePath(path);
    } else {
      setDestProtocol(conn.protocol ?? "ftp");
      setDestHost(conn.host);
      setDestPort(conn.port ? String(conn.port) : "");
      setDestUser(conn.user);
      setDestPass(conn.password);
      setDestPath(path);
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
    protocol: Protocol,
    host: string,
    port: string,
    user: string,
    password: string,
    path: string
  ): Promise<boolean> => {
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
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saveSource && sourceProtocol !== "gdrive") {
      const label = sourceLabel.trim() || sourceHost;
      saveServer(label, sourceProtocol, sourceHost, sourcePort, sourceUser, sourcePass, sourcePath).then((ok) => {
        setSourceSaveStatus(ok ? "success" : "error");
        setTimeout(() => setSourceSaveStatus(undefined), 2500);
      });
      setSaveSource(false);
      setSourceLabel("");
    }
    if (saveDest && destProtocol !== "gdrive") {
      const label = destLabel.trim() || destHost;
      saveServer(label, destProtocol, destHost, destPort, destUser, destPass, destPath).then((ok) => {
        setDestSaveStatus(ok ? "success" : "error");
        setTimeout(() => setDestSaveStatus(undefined), 2500);
      });
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

  return (
    <section id="transfer" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Start a <span className="gradient-text">Transfer</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Enter the FTP/SFTP credentials for both servers, or connect Google
            Drive. We connect, stream, and confirm. Optionally save a server
            to reuse it on future transfers — saved credentials are encrypted
            at rest.
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
            <ServerFieldsPanel
              title="Source Server" subtitle="Copy FROM here"
              iconColor="bg-emerald-500/20 text-emerald-400"
              isPro={!!user.isPro}
              savedConnections={connections}
              savedId={sourceSavedId}
              onSavedChange={(id) => { setSourceSavedId(id); if (id) applySaved("source", id); }}
              onDeleteSaved={(id) => deleteSaved("source", id)}
              protocol={sourceProtocol} setProtocol={setSourceProtocol}
              host={sourceHost} setHost={setSourceHost}
              port={sourcePort} setPort={setSourcePort}
              user={sourceUser} setUser={setSourceUser}
              pass={sourcePass} setPass={setSourcePass}
              path={sourcePath} setPath={setSourcePath}
              pathLabel="File Path"
              pathPlaceholder="/public_html/backups/archive.tar.gz"
              pickerMode="file"
              save={saveSource} setSave={setSaveSource}
              label={sourceLabel} setLabel={setSourceLabel}
              saveStatus={sourceSaveStatus}
              idPrefix="src"
            />
            <ServerFieldsPanel
              title="Destination Server" subtitle="Send TO here"
              iconColor="bg-blue-500/20 text-blue-400"
              isPro={!!user.isPro}
              savedConnections={connections}
              savedId={destSavedId}
              onSavedChange={(id) => { setDestSavedId(id); if (id) applySaved("destination", id); }}
              onDeleteSaved={(id) => deleteSaved("destination", id)}
              protocol={destProtocol} setProtocol={setDestProtocol}
              host={destHost} setHost={setDestHost}
              port={destPort} setPort={setDestPort}
              user={destUser} setUser={setDestUser}
              pass={destPass} setPass={setDestPass}
              path={destPath} setPath={setDestPath}
              pathLabel="Destination Path"
              pathPlaceholder="/backups/archive.tar.gz"
              pickerMode="folder"
              save={saveDest} setSave={setSaveDest}
              label={destLabel} setLabel={setDestLabel}
              saveStatus={destSaveStatus}
              idPrefix="dst"
            />
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
