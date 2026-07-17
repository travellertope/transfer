"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Protocol } from "@/lib/transferClients";

export interface TransferUiState {
  status: "idle" | "transferring" | "success" | "error";
  message: string;
  bytesTransferred?: number;
  totalBytes?: number | null;
  limitExceeded?: boolean;
}

interface TransferServerConfig {
  protocol: Protocol;
  host: string;
  port?: number;
  user: string;
  password: string;
  path: string;
}

const POLL_INTERVAL_MS = 1500;

/**
 * Kicks off a transfer as a background job on the server and polls for
 * progress. The job keeps running server-side even if this component
 * unmounts, the tab closes, or the network hiccups — only the polling
 * (i.e. what this hook can show) stops; the transfer itself doesn't.
 */
export function useTransferJob() {
  const [state, setState] = useState<TransferUiState>({ status: "idle", message: "" });
  const generationRef = useRef(0);
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      generationRef.current++;
    };
  }, []);

  const poll = useCallback((jobId: string, generation: number) => {
    const tick = async () => {
      if (generationRef.current !== generation) return;

      let res: Response;
      try {
        res = await fetch(`/api/transfer/${jobId}`);
      } catch {
        setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      if (generationRef.current !== generation) return;

      const data = await res.json().catch(() => null);
      if (generationRef.current !== generation) return;

      if (!res.ok || !data?.job) {
        setState({ status: "error", message: data?.error || "Lost track of the transfer." });
        return;
      }

      const job = data.job;
      if (job.status === "success") {
        setState({
          status: "success",
          message: job.message || "Transfer complete.",
          bytesTransferred: job.bytesTransferred,
        });
        return;
      }
      if (job.status === "failed") {
        setState({ status: "error", message: job.error || "Transfer failed." });
        return;
      }
      if (job.status === "cancelled") {
        setState({ status: "error", message: "Transfer cancelled." });
        return;
      }

      setState({
        status: "transferring",
        message: job.message || (job.status === "connecting" ? "Connecting to servers…" : "Transferring…"),
        bytesTransferred: job.bytesTransferred,
        totalBytes: job.totalBytes,
      });
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  }, []);

  const start = useCallback(
    async (source: TransferServerConfig, destination: TransferServerConfig) => {
      const generation = ++generationRef.current;
      jobIdRef.current = null;
      setState({ status: "transferring", message: "Connecting to servers…" });

      try {
        const res = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, destination }),
        });
        const data = await res.json();
        if (generationRef.current !== generation) return;

        if (!res.ok || !data.success) {
          setState({
            status: "error",
            message: data.error || "Transfer failed to start.",
            limitExceeded: data.code === "LIMIT_EXCEEDED",
          });
          return;
        }

        jobIdRef.current = data.job.id;
        setState({
          status: "transferring",
          message: "Transferring…",
          bytesTransferred: data.job.bytesTransferred,
          totalBytes: data.job.totalBytes,
        });
        poll(data.job.id, generation);
      } catch {
        if (generationRef.current === generation) {
          setState({ status: "error", message: "Network error. Please try again." });
        }
      }
    },
    [poll]
  );

  const cancel = useCallback(() => {
    generationRef.current++;
    const jobId = jobIdRef.current;
    if (jobId) {
      fetch(`/api/transfer/${jobId}`, { method: "DELETE" }).catch(() => {});
    }
    setState({ status: "error", message: "Transfer cancelled." });
  }, []);

  return { state, start, cancel };
}
