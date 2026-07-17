"use client";

import { useState } from "react";
import { FolderOpen, FileText, Loader2 } from "lucide-react";

// The Google Picker/API JS SDK is loaded dynamically at runtime and has no
// first-party types available in this project, so it's accessed through a
// narrow `any` surface confined to this file.
declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
    google?: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        DocsView: new (viewId: unknown) => GoogleDocsView;
        ViewId: { FOLDERS: unknown; DOCS: unknown };
        Action: { PICKED: string };
        Feature: { NAV_HIDDEN: unknown };
      };
    };
  }
}

interface GoogleDocsView {
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsView;
  setIncludeFolders: (include: boolean) => GoogleDocsView;
}

interface GooglePickerBuilder {
  addView: (view: unknown) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  enableFeature: (feature: unknown) => GooglePickerBuilder;
  setCallback: (cb: (data: PickerResponse) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface PickerResponse {
  action: string;
  docs?: { id: string; name: string; mimeType: string }[];
}

let apiScriptPromise: Promise<void> | null = null;

function loadGoogleApiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.gapi) return Promise.resolve();
  if (apiScriptPromise) return apiScriptPromise;

  apiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Google API script."));
    document.body.appendChild(script);
  });
  return apiScriptPromise;
}

function loadPicker(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error("Google API script didn't load."));
      return;
    }
    window.gapi.load("picker", () => resolve());
  });
}

export function GoogleDrivePicker({
  connectionId,
  mode,
  onSelect,
  buttonClassName,
}: {
  connectionId: string;
  mode: "file" | "folder";
  onSelect: (id: string, name: string) => void;
  buttonClassName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openPicker = async () => {
    setError("");
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("Google Picker isn't configured (missing NEXT_PUBLIC_GOOGLE_API_KEY).");
      }

      const tokenRes = await fetch(`/api/gdrive/access-token?connectionId=${encodeURIComponent(connectionId)}`);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.accessToken) {
        throw new Error(tokenData.error || "Couldn't get a Google Drive access token.");
      }

      await loadGoogleApiScript();
      await loadPicker();

      const google = window.google;
      if (!google) throw new Error("Google Picker script didn't load.");

      const view =
        mode === "folder"
          ? new google.picker.DocsView(google.picker.ViewId.FOLDERS)
              .setSelectFolderEnabled(true)
              .setIncludeFolders(true)
          : new google.picker.DocsView(google.picker.ViewId.DOCS);

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(tokenData.accessToken)
        .setDeveloperKey(apiKey)
        .setCallback((data: PickerResponse) => {
          if (data.action === google.picker.Action.PICKED && data.docs?.[0]) {
            onSelect(data.docs[0].id, data.docs[0].name);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't open the Google Drive picker.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        disabled={loading}
        className={
          buttonClassName ??
          "flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:border-primary/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-60"
        }
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : mode === "folder" ? (
          <FolderOpen className="w-4 h-4" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        Choose {mode === "folder" ? "a folder" : "a file"} from Drive
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
