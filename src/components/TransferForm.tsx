"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Server,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { formatBytes } from "@/lib/limits";

interface TransferState {
  status: "idle" | "transferring" | "success" | "error";
  message: string;
  bytesTransferred?: number;
  limitExceeded?: boolean;
}

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

  const [sourceHost, setSourceHost] = useState("");
  const [sourceUser, setSourceUser] = useState("");
  const [sourcePass, setSourcePass] = useState("");
  const [sourcePath, setSourcePath] = useState("");

  const [destHost, setDestHost] = useState("");
  const [destUser, setDestUser] = useState("");
  const [destPass, setDestPass] = useState("");
  const [destPath, setDestPath] = useState("");

  const [transfer, setTransfer] = useState<TransferState>({
    status: "idle",
    message: "",
  });

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    setTransfer({ status: "transferring", message: "Connecting to servers..." });

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            host: sourceHost,
            user: sourceUser,
            password: sourcePass,
            path: sourcePath,
          },
          destination: {
            host: destHost,
            user: destUser,
            password: destPass,
            path: destPath,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTransfer({
          status: "success",
          message: data.message,
          bytesTransferred: data.bytesTransferred,
        });
      } else {
        setTransfer({
          status: "error",
          message: data.error || "Transfer failed. Check your credentials and paths.",
          limitExceeded: data.code === "LIMIT_EXCEEDED",
        });
      }
    } catch {
      setTransfer({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
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
            confirm. Your credentials are used in-memory only and never stored.
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
                <div>
                  <label
                    htmlFor="srcHost"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    FTP Host
                  </label>
                  <input
                    id="srcHost"
                    type="text"
                    value={sourceHost}
                    onChange={(e) => setSourceHost(e.target.value)}
                    placeholder="ftp.source-server.com"
                    className={inputClass}
                    required
                  />
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
                <div>
                  <label
                    htmlFor="dstHost"
                    className="block text-sm text-slate-600 dark:text-slate-400 mb-1"
                  >
                    FTP Host
                  </label>
                  <input
                    id="dstHost"
                    type="text"
                    value={destHost}
                    onChange={(e) => setDestHost(e.target.value)}
                    placeholder="ftp.destination-server.com"
                    className={inputClass}
                    required
                  />
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

        {/* Status Display */}
        {transfer.status === "transferring" && (
          <div className="glass-card rounded-2xl p-6 text-center">
            <Loader2 className="w-8 h-8 text-primary-light animate-spin mx-auto mb-3" />
            <p className="text-slate-900 dark:text-white font-medium mb-1">Transfer in Progress</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Streaming data directly between servers. This may take several
              minutes for large files. You can keep this tab open or check back
              later.
            </p>
          </div>
        )}

        {transfer.status === "success" && (
          <div className="glass-card rounded-2xl p-6 text-center border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-900 dark:text-white font-medium mb-1">Transfer Complete</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{transfer.message}</p>
            {transfer.bytesTransferred && (
              <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400">
                {formatBytes(transfer.bytesTransferred)} transferred
              </p>
            )}
          </div>
        )}

        {transfer.status === "error" && (
          <div className="glass-card rounded-2xl p-6 text-center border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-slate-900 dark:text-white font-medium mb-1">Transfer Failed</p>
            <p className="text-sm text-red-600 dark:text-red-300 mb-2">{transfer.message}</p>
            {transfer.limitExceeded && (
              <a href="#pricing" className="text-sm text-primary-light hover:underline">
                Upgrade to Pro for 10GB transfers →
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
