import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { limitForUser, formatBytes, FREE_MONTHLY_TRANSFER_LIMIT } from "@/lib/limits";
import { createTransferClient, type Protocol, type ServerConfig } from "@/lib/transferClients";
import { createJob, jobSnapshot, jobListSnapshot, listJobsForUser } from "@/lib/jobs";
import { enqueueJob } from "@/lib/transferWorker";
import { addHistory, listHistory } from "@/lib/wordpress";

function normalizeConfig(config: ServerConfig): ServerConfig {
  const protocols: Protocol[] = ["ftp", "sftp", "gdrive"];
  return {
    ...config,
    protocol: protocols.includes(config.protocol) ? config.protocol : "ftp",
  };
}

/**
 * Writes the "in_progress" history record a transfer will live-update as it
 * runs. This happens *before* the job is created at all — a transfer is
 * never allowed to start without a corresponding history record already
 * durably stored in WordPress, so a server restart mid-transfer can never
 * make it disappear without a trace. Retries a couple of times to ride out
 * a brief WP hiccup before giving up.
 */
async function writeInitialHistoryRecord(
  token: string,
  source: ServerConfig,
  destination: ServerConfig
): Promise<string> {
  const attempts = 3;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const record = await addHistory(token, {
        source_host: source.host,
        source_path: source.path,
        dest_host: destination.host,
        dest_path: destination.path,
        bytes: 0,
        status: "in_progress",
        error: "",
        source,
        destination,
      });
      return record.id;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/** Active (non-terminal) transfers for the current user, e.g. for showing progress on the History page. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const jobs = listJobsForUser(user.id)
    .filter((job) => job.status !== "success" && job.status !== "failed" && job.status !== "cancelled")
    .map(jobListSnapshot);

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const token = getSessionToken(req);
  if (!user || !token) {
    return NextResponse.json(
      { success: false, error: "You must be logged in to start a transfer." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const source = normalizeConfig(body.source);
  const destination = normalizeConfig(body.destination);

  if (!source?.host || !source?.user || !source?.password || !source?.path) {
    return NextResponse.json(
      { success: false, error: "Missing source server configuration." },
      { status: 400 }
    );
  }
  if (!destination?.host || !destination?.user || !destination?.password || !destination?.path) {
    return NextResponse.json(
      { success: false, error: "Missing destination server configuration." },
      { status: 400 }
    );
  }

  if ((source.protocol === "gdrive" || destination.protocol === "gdrive") && !user.isPro) {
    return NextResponse.json(
      { success: false, error: "Google Drive transfers are a Pro feature. Upgrade to use them." },
      { status: 403 }
    );
  }

  if (!user.isPro) {
    try {
      const history = await listHistory(token);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const usedThisMonth = history.filter((t) => new Date(t.created_at) >= monthStart).length;
      if (usedThisMonth >= FREE_MONTHLY_TRANSFER_LIMIT) {
        return NextResponse.json(
          {
            success: false,
            code: "LIMIT_EXCEEDED",
            error: `You've used all ${FREE_MONTHLY_TRANSFER_LIMIT} free transfers this month. Upgrade to Pro for unlimited transfers.`,
          },
          { status: 403 }
        );
      }
    } catch {
      /* if WP is briefly unreachable, don't block a legitimate transfer over an undercount */
    }
  }

  // Quick probe up front: confirms the source is reachable and checks the
  // file size against the tier limit before committing to a background job,
  // so obviously-bad input still fails fast instead of queueing.
  const probeClient = createTransferClient(source.protocol);
  let fileSize: number;
  try {
    await probeClient.connect(source);
    fileSize = await probeClient.size(source.path);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    probeClient.close();
  }

  const limit = limitForUser(user.isPro);
  if (fileSize > limit) {
    return NextResponse.json(
      {
        success: false,
        code: "LIMIT_EXCEEDED",
        error: `File is ${formatBytes(fileSize)}, which exceeds your ${
          user.isPro ? "Pro" : "Free"
        } limit of ${formatBytes(limit)}.`,
      },
      { status: 403 }
    );
  }

  let historyId: string;
  try {
    historyId = await writeInitialHistoryRecord(token, source, destination);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Couldn't reach our records service to start the transfer. Please try again in a moment.",
      },
      { status: 503 }
    );
  }

  // From here the transfer runs in the background, independent of this
  // request — closing the tab, sleeping, or a flaky wifi connection no
  // longer kills it. The client polls GET /api/transfer/{id} for progress.
  const job = createJob({
    userId: user.id,
    wpToken: token,
    isPro: user.isPro,
    appOrigin: req.nextUrl.origin,
    historyId,
    source,
    destination,
    totalBytes: fileSize,
  });
  enqueueJob(job.id);

  return NextResponse.json({ success: true, job: jobSnapshot(job) }, { status: 202 });
}
