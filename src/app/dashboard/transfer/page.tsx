"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useTransferJob } from "@/components/useTransferJob";
import { TransferStatusCard } from "@/components/TransferStatusCard";
import { ServerFieldsPanel } from "@/components/ServerFieldsPanel";
import type { SavedConnection } from "@/lib/wordpress";
import type { Protocol } from "@/lib/transferClients";

export default function TransferPage() {
  const { user } = useAuth();

  const [srcProtocol, setSrcProtocol] = useState<Protocol>("ftp");
  const [srcHost, setSrcHost] = useState("");
  const [srcPort, setSrcPort] = useState("");
  const [srcUser, setSrcUser] = useState("");
  const [srcPass, setSrcPass] = useState("");
  const [srcPath, setSrcPath] = useState("");
  const [dstProtocol, setDstProtocol] = useState<Protocol>("ftp");
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

  const applySaved = (panel: "source" | "destination", id: string) => {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;
    const path = conn.protocol === "gdrive" ? "" : conn.path;
    if (panel === "source") {
      setSrcProtocol(conn.protocol ?? "ftp"); setSrcHost(conn.host); setSrcPort(conn.port ? String(conn.port) : "");
      setSrcUser(conn.user); setSrcPass(conn.password); setSrcPath(path);
    } else {
      setDstProtocol(conn.protocol ?? "ftp"); setDstHost(conn.host); setDstPort(conn.port ? String(conn.port) : "");
      setDstUser(conn.user); setDstPass(conn.password); setDstPath(path);
    }
  };

  const deleteSaved = async (panel: "source" | "destination", id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (panel === "source") setSrcSavedId(""); else setDstSavedId("");
    await fetch(`/api/connections/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const saveServer = async (
    lbl: string,
    protocol: Protocol,
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

    if (saveSource && srcLabel && srcProtocol !== "gdrive") {
      saveServer(srcLabel, srcProtocol, srcHost, srcPort, srcUser, srcPass, srcPath);
      setSaveSource(false); setSrcLabel("");
    }
    if (saveDest && dstLabel && dstProtocol !== "gdrive") {
      saveServer(dstLabel, dstProtocol, dstHost, dstPort, dstUser, dstPass, dstPath);
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
          <ServerFieldsPanel
            title="Source Server" subtitle="Copy FROM here"
            iconColor="bg-emerald-500/20 text-emerald-400"
            isPro={!!user?.isPro}
            savedConnections={connections}
            savedId={srcSavedId}
            onSavedChange={(id) => { setSrcSavedId(id); if (id) applySaved("source", id); }}
            onDeleteSaved={(id) => deleteSaved("source", id)}
            protocol={srcProtocol} setProtocol={setSrcProtocol}
            host={srcHost} setHost={setSrcHost}
            port={srcPort} setPort={setSrcPort}
            user={srcUser} setUser={setSrcUser}
            pass={srcPass} setPass={setSrcPass}
            path={srcPath} setPath={setSrcPath}
            pathLabel="File Path"
            pathPlaceholder="/public_html/backups/archive.tar.gz"
            pickerMode="file"
            save={saveSource} setSave={setSaveSource}
            label={srcLabel} setLabel={setSrcLabel}
            idPrefix="src"
          />
          <ServerFieldsPanel
            title="Destination Server" subtitle="Send TO here"
            iconColor="bg-blue-500/20 text-blue-400"
            isPro={!!user?.isPro}
            savedConnections={connections}
            savedId={dstSavedId}
            onSavedChange={(id) => { setDstSavedId(id); if (id) applySaved("destination", id); }}
            onDeleteSaved={(id) => deleteSaved("destination", id)}
            protocol={dstProtocol} setProtocol={setDstProtocol}
            host={dstHost} setHost={setDstHost}
            port={dstPort} setPort={setDstPort}
            user={dstUser} setUser={setDstUser}
            pass={dstPass} setPass={setDstPass}
            path={dstPath} setPath={setDstPath}
            pathLabel="Destination Path"
            pathPlaceholder="/backups/archive.tar.gz"
            pickerMode="folder"
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
