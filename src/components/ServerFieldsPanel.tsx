"use client";

import { useEffect, useState } from "react";
import { Server, HardDrive, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { GoogleDrivePicker } from "./GoogleDrivePicker";
import type { SavedConnection } from "@/lib/wordpress";
import type { Protocol } from "@/lib/transferClients";

const inputClass =
  "w-full px-4 py-3 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-sm";

export function PasswordInput({
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

export interface ServerFieldsPanelProps {
  title: string;
  subtitle: string;
  iconColor: string;
  isPro: boolean;
  savedConnections: SavedConnection[];
  savedId: string;
  onSavedChange: (id: string) => void;
  onDeleteSaved: (id: string) => void;
  protocol: Protocol;
  setProtocol: (v: Protocol) => void;
  host: string;
  setHost: (v: string) => void;
  port: string;
  setPort: (v: string) => void;
  user: string;
  setUser: (v: string) => void;
  pass: string;
  setPass: (v: string) => void;
  path: string;
  setPath: (v: string) => void;
  pathLabel: string;
  pathPlaceholder: string;
  /** For Google Drive: source picks a file, destination picks a folder to upload into. */
  pickerMode: "file" | "folder";
  save: boolean;
  setSave: (v: boolean) => void;
  label: string;
  setLabel: (v: string) => void;
  idPrefix: string;
  /** Feedback for the last save-this-server attempt, shown briefly next to the checkbox. */
  saveStatus?: "success" | "error";
}

export function ServerFieldsPanel({
  title, subtitle, iconColor, isPro,
  savedConnections, savedId, onSavedChange, onDeleteSaved,
  protocol, setProtocol, host, setHost, port, setPort, user, setUser,
  pass, setPass, path, setPath, pathLabel, pathPlaceholder, pickerMode,
  save, setSave, label, setLabel, idPrefix, saveStatus,
}: ServerFieldsPanelProps) {
  const [pathDisplayName, setPathDisplayName] = useState("");

  useEffect(() => {
    setPathDisplayName("");
  }, [savedId, protocol]);

  const filteredSaved = savedConnections.filter((c) =>
    protocol === "gdrive" ? c.protocol === "gdrive" : c.protocol !== "gdrive"
  );

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          {protocol === "gdrive" ? <HardDrive className="w-5 h-5" /> : <Server className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={`${idPrefix}-protocol`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
            Protocol
          </label>
          <select
            id={`${idPrefix}-protocol`}
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as Protocol)}
            className={inputClass}
          >
            <option value="ftp">FTP</option>
            <option value="sftp">SFTP</option>
            <option value="gdrive">Google Drive{isPro ? "" : " (Pro)"}</option>
          </select>
        </div>

        {protocol === "gdrive" ? (
          !isPro ? (
            <div className="text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4">
              Google Drive transfers are a Pro feature.{" "}
              <a href="/#pricing" className="text-primary-light hover:underline">Upgrade</a> to connect an account.
            </div>
          ) : (
            <>
              {filteredSaved.length === 0 ? (
                <div className="text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4">
                  No Google account connected yet.{" "}
                  <a href="/dashboard/servers" className="text-primary-light hover:underline">Connect one in Saved Servers</a>.
                </div>
              ) : (
                <div>
                  <label htmlFor={`${idPrefix}-gdrive-account`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Google Account
                  </label>
                  <select
                    id={`${idPrefix}-gdrive-account`}
                    value={savedId}
                    onChange={(e) => onSavedChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose an account...</option>
                    {filteredSaved.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {savedId && host && (
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {pickerMode === "folder" ? "Destination Folder" : "File"}
                  </label>
                  <GoogleDrivePicker
                    connectionId={savedId}
                    mode={pickerMode}
                    onSelect={(id, name) => {
                      setPath(id);
                      setPathDisplayName(name);
                    }}
                  />
                  {pathDisplayName && (
                    <p className="text-xs text-slate-500 mt-1.5 truncate">Selected: {pathDisplayName}</p>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          <>
            {filteredSaved.length > 0 && (
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
                    {filteredSaved.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  {savedId && (
                    <button
                      type="button"
                      onClick={() => onDeleteSaved(savedId)}
                      className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

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
                <label htmlFor={`${idPrefix}-port`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Port
                </label>
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
              <label htmlFor={`${idPrefix}-user`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Username
              </label>
              <input
                id={`${idPrefix}-user`}
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="ftp_username"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-pass`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Password
              </label>
              <PasswordInput id={`${idPrefix}-pass`} value={pass} onChange={setPass} placeholder="••••••••" />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-path`} className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                {pathLabel}
              </label>
              <input
                id={`${idPrefix}-path`}
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={pathPlaceholder}
                className={inputClass}
                required
              />
            </div>
          </>
        )}

        {protocol !== "gdrive" && (
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={save}
                onChange={(e) => setSave(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">Save this server for next time</span>
              {saveStatus === "success" && (
                <span className="inline-flex items-center gap-1 text-emerald-500 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="inline-flex items-center gap-1 text-red-500 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed to save
                </span>
              )}
            </label>
            {save && (
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Label (optional — defaults to "${host || "the host"}")`}
                className={inputClass}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
