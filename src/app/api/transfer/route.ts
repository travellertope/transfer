import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { limitForUser, formatBytes } from "@/lib/limits";
import { createTransferClient, type Protocol, type ServerConfig } from "@/lib/transferClients";
import { createJob, updateJob, jobSnapshot, jobListSnapshot, listJobsForUser } from "@/lib/jobs";
import { enqueueJob } from "@/lib/transferWorker";
import { addHistory } from "@/lib/wordpress";

function normalizeConfig(config: ServerConfig): ServerConfig {
  const protocols: Protocol[] = ["ftp", "sftp", "gdrive"];
  return {
    ...config,
    protocol: protocols.includes(config.protocol) ? config.protocol : "ftp",
  };
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

  // From here the transfer runs in the background, independent of this
  // request — closing the tab, sleeping, or a flaky wifi connection no
  // longer kills it. The client polls GET /api/transfer/{id} for progress.
  const job = createJob({
    userId: user.id,
    wpToken: token,
    isPro: user.isPro,
    appOrigin: req.nextUrl.origin,
    source,
    destination,
    totalBytes: fileSize,
  });

  // Written up front (before the transfer does anything) so an interrupted
  // job — server restart, crash — leaves a visible trace in History instead
  // of vanishing with nothing ever recorded. Best-effort: if WP is briefly
  // unreachable, the transfer still starts, and the worker just creates the
  // record fresh on completion instead of updating this one.
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
    updateJob(job.id, { historyId: record.id });
  } catch {
    /* fall back to create-on-completion in the worker */
  }

  enqueueJob(job.id);

  return NextResponse.json({ success: true, job: jobSnapshot(job) }, { status: 202 });
}
