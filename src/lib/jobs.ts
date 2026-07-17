import { randomUUID } from "crypto";
import type { ServerConfig } from "./transferClients";

export type JobStatus =
  | "queued"
  | "connecting"
  | "transferring"
  | "success"
  | "failed"
  | "cancelled";

export interface TransferJob {
  id: string;
  userId: number;
  wpToken: string;
  isPro: boolean;
  /** The app's own origin (e.g. https://airftp.example.com), captured at job creation for building links in completion emails sent later from the background worker, which has no request of its own. */
  appOrigin: string;
  /** WP history record id — the initial "in_progress" record is written before the job is ever created (see POST /api/transfer), so the worker can update that same record on completion instead of creating a new one. */
  historyId: string;
  source: ServerConfig;
  destination: ServerConfig;
  status: JobStatus;
  bytesTransferred: number;
  totalBytes: number | null;
  /** Recent throughput (bytes/sec over the last few seconds), for showing an ETA. Null until enough data has flowed to estimate it. */
  bytesPerSecond: number | null;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  message: string | null;
  cancelRequested: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * In-memory job store. Jobs live only as long as this Node process does — a
 * restart/redeploy loses in-flight jobs. That's an explicit trade-off for
 * keeping this dependency-free (no Redis/DB); see the worker module for why
 * this requires running as a persistent server rather than serverless
 * functions in the first place.
 */
const jobs = new Map<string, TransferJob>();

export function createJob(input: {
  userId: number;
  wpToken: string;
  isPro: boolean;
  appOrigin: string;
  historyId: string;
  source: ServerConfig;
  destination: ServerConfig;
  totalBytes: number;
}): TransferJob {
  const now = Date.now();
  const job: TransferJob = {
    id: randomUUID(),
    userId: input.userId,
    wpToken: input.wpToken,
    isPro: input.isPro,
    appOrigin: input.appOrigin,
    historyId: input.historyId,
    source: input.source,
    destination: input.destination,
    status: "queued",
    bytesTransferred: 0,
    totalBytes: input.totalBytes,
    bytesPerSecond: null,
    attempts: 0,
    maxAttempts: 5,
    error: null,
    message: null,
    cancelRequested: false,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): TransferJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<TransferJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: Date.now() });
}

export function requestCancel(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.cancelRequested = true;
  job.updatedAt = Date.now();
  return true;
}

/** Job status/progress only — never includes credentials. */
export function jobSnapshot(job: TransferJob) {
  return {
    id: job.id,
    status: job.status,
    bytesTransferred: job.bytesTransferred,
    totalBytes: job.totalBytes,
    bytesPerSecond: job.bytesPerSecond,
    attempts: job.attempts,
    error: job.error,
    message: job.message,
  };
}

/** All of a user's jobs, newest first — for showing "in progress" transfers on the History page. */
export function listJobsForUser(userId: number): TransferJob[] {
  return [...jobs.values()]
    .filter((job) => job.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Same as jobSnapshot, plus non-secret host/path so a list view can show a route label. */
export function jobListSnapshot(job: TransferJob) {
  return {
    ...jobSnapshot(job),
    sourceHost: job.source.host,
    sourcePath: job.source.path,
    destHost: job.destination.host,
    destPath: job.destination.path,
  };
}

// Old jobs are cleaned up periodically so the map doesn't grow unbounded on a
// long-lived server. Terminal jobs are kept around for a while so a client
// that was slow to poll still sees the final result.
const JOB_RETENTION_MS = 30 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - JOB_RETENTION_MS;
  for (const [id, job] of jobs) {
    const isTerminal = job.status === "success" || job.status === "failed" || job.status === "cancelled";
    if (isTerminal && job.updatedAt < cutoff) {
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();
