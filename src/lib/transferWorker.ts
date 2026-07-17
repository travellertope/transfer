import { PassThrough } from "stream";
import { createTransferClient, isRetryableTransferError, type TransferClient } from "./transferClients";
import { addHistory, updateHistory, notifyTransferComplete, listWebhooks } from "./wordpress";
import { dispatchWebhooksForEvent } from "./webhookDispatch";
import { getJob, updateJob, type TransferJob } from "./jobs";

/**
 * In-process job queue. This only works because the app runs as a single
 * long-lived Node server (`next start`, not Vercel-style serverless
 * functions) — the whole point is that a transfer keeps running here after
 * the HTTP request that started it has already returned, so it survives the
 * browser closing, sleeping, or losing wifi. On serverless hosting, nothing
 * would keep this process alive between requests and queued jobs would just
 * evaporate.
 */
const MAX_CONCURRENT_TRANSFERS = 5;
let runningCount = 0;
const queue: string[] = [];

export function enqueueJob(jobId: string): void {
  queue.push(jobId);
  pump();
}

function pump(): void {
  while (runningCount < MAX_CONCURRENT_TRANSFERS && queue.length > 0) {
    const jobId = queue.shift();
    if (!jobId) continue;
    runningCount++;
    runJob(jobId)
      .catch(() => {
        /* runJob handles its own error state; this is a last-resort guard */
      })
      .finally(() => {
        runningCount--;
        pump();
      });
  }
}

async function sizeSafe(client: TransferClient, path: string): Promise<number> {
  try {
    return await client.size(path);
  } catch {
    return 0;
  }
}

function backoffMs(attempt: number): number {
  return Math.min(2000 * 2 ** (attempt - 1), 30000);
}

async function runJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  let lastError = "";

  while (job.attempts < job.maxAttempts) {
    if (job.cancelRequested) {
      updateJob(jobId, { status: "cancelled", message: "Cancelled." });
      recordHistory(job, "failed", job.bytesTransferred, "Cancelled by user");
      return;
    }

    updateJob(jobId, { status: "connecting", attempts: job.attempts + 1 });

    let sourceClient: TransferClient | null = null;
    let destClient: TransferClient | null = null;

    try {
      sourceClient = createTransferClient(job.source.protocol);
      await sourceClient.connect(job.source);

      destClient = createTransferClient(job.destination.protocol);
      await destClient.connect(job.destination);

      const destDir = job.destination.path.substring(0, job.destination.path.lastIndexOf("/"));
      if (destDir) {
        await destClient.ensureDir(destDir);
      }

      // Google Drive has no byte-offset "append to existing file" — a retry
      // just re-uploads the file from scratch, so resume only applies to
      // FTP/SFTP destinations.
      const resumeOffset =
        job.attempts > 1 && job.destination.protocol !== "gdrive"
          ? await sizeSafe(destClient, job.destination.path)
          : 0;

      if (job.cancelRequested) {
        sourceClient.close();
        destClient.close();
        updateJob(jobId, { status: "cancelled", message: "Cancelled." });
        recordHistory(job, "failed", job.bytesTransferred, "Cancelled by user");
        return;
      }

      // Drive destinations are "<folderId>" only — it needs a file name too,
      // which it doesn't have a path segment for, so borrow the source's.
      const destinationPath =
        job.destination.protocol === "gdrive"
          ? `${job.destination.path}/${await sourceClient.fileName(job.source.path)}`
          : job.destination.path;

      updateJob(jobId, { status: "transferring", bytesTransferred: resumeOffset });

      const pipe = new PassThrough();
      let sessionBytes = 0;
      let lastProgressUpdate = 0;
      pipe.on("data", (chunk: Buffer) => {
        sessionBytes += chunk.length;
        // The client only polls every couple of seconds — updating the job
        // record on every single chunk (tens of thousands of times for a
        // large file) is pure overhead. Throttle to a few times a second.
        const now = Date.now();
        if (now - lastProgressUpdate >= 250) {
          lastProgressUpdate = now;
          updateJob(jobId, { bytesTransferred: resumeOffset + sessionBytes });
        }
      });

      await Promise.all([
        sourceClient.downloadTo(pipe, job.source.path, resumeOffset),
        destClient.uploadFrom(pipe, destinationPath, resumeOffset > 0),
      ]);

      sourceClient.close();
      destClient.close();

      const finalBytes = resumeOffset + sessionBytes;
      updateJob(jobId, {
        status: "success",
        bytesTransferred: finalBytes,
        message: `Transfer complete. ${finalBytes} bytes streamed from source to destination.`,
      });

      recordHistory(job, "success", finalBytes, "");
      notifyComplete(job, "transfer.success", finalBytes, "");
      dispatchWebhooks(job, "transfer.success", finalBytes, "");
      return;
    } catch (err) {
      sourceClient?.close();
      destClient?.close();

      lastError = err instanceof Error ? err.message : String(err);

      if (job.cancelRequested) {
        updateJob(jobId, { status: "cancelled", message: "Cancelled." });
        recordHistory(job, "failed", job.bytesTransferred, "Cancelled by user");
        return;
      }

      if (!isRetryableTransferError(err) || job.attempts >= job.maxAttempts) {
        break;
      }

      updateJob(jobId, { message: `Attempt ${job.attempts} failed (${lastError}). Retrying…` });
      await new Promise((resolve) => setTimeout(resolve, backoffMs(job.attempts)));
    }
  }

  updateJob(jobId, { status: "failed", error: lastError || "Transfer failed." });
  recordHistory(job, "failed", job.bytesTransferred, lastError);
  notifyComplete(job, "transfer.failed", job.bytesTransferred, lastError);
  dispatchWebhooks(job, "transfer.failed", job.bytesTransferred, lastError);
}

function recordHistory(job: TransferJob, status: "success" | "failed", bytes: number, error: string): void {
  // The common path: the initial "in_progress" record already exists
  // (written up front in the POST handler), so just flip it to its outcome
  // in place rather than creating a second record.
  if (job.historyId) {
    updateHistory(job.wpToken, job.historyId, { status, bytes, error }).catch(() => {
      /* history is best-effort; don't let a WP hiccup mask the transfer outcome */
    });
    return;
  }

  // Fallback for when that initial write failed (WP hiccup) — still record
  // the outcome, just as a fresh record instead of an update.
  addHistory(job.wpToken, {
    source_host: job.source.host,
    source_path: job.source.path,
    dest_host: job.destination.host,
    dest_path: job.destination.path,
    bytes,
    status,
    error,
    source: job.source,
    destination: job.destination,
  }).catch(() => {
    /* history is best-effort; don't let a WP hiccup mask the transfer outcome */
  });
}

/** Completion email — a Pro perk, matching Saved Servers and Google Drive. */
function notifyComplete(job: TransferJob, event: "transfer.success" | "transfer.failed", bytes: number, error: string): void {
  if (!job.isPro) return;

  notifyTransferComplete(job.wpToken, event, {
    sourceHost: job.source.host,
    destHost: job.destination.host,
    bytes,
    error,
    historyUrl: `${job.appOrigin}/dashboard/history`,
  }).catch(() => {
    /* notification is best-effort; don't let it mask the transfer outcome */
  });
}

/** Webhook delivery — a Pro perk, same gating as the completion email. */
function dispatchWebhooks(job: TransferJob, event: "transfer.success" | "transfer.failed", bytes: number, error: string): void {
  if (!job.isPro) return;

  listWebhooks(job.wpToken)
    .then((webhooks) =>
      dispatchWebhooksForEvent(webhooks, event, {
        id: job.historyId ?? job.id,
        source_host: job.source.host,
        dest_host: job.destination.host,
        bytes,
        created_at: new Date().toISOString(),
        ...(error ? { error } : {}),
      })
    )
    .catch(() => {
      /* webhook delivery is best-effort; don't let it mask the transfer outcome */
    });
}
