import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { limitForUser, formatBytes } from "@/lib/limits";
import { createTransferClient, type ServerConfig } from "@/lib/transferClients";
import { createJob, jobSnapshot } from "@/lib/jobs";
import { enqueueJob } from "@/lib/transferWorker";

function normalizeConfig(config: ServerConfig): ServerConfig {
  return {
    ...config,
    protocol: config.protocol === "sftp" ? "sftp" : "ftp",
  };
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
    source,
    destination,
    totalBytes: fileSize,
  });
  enqueueJob(job.id);

  return NextResponse.json({ success: true, job: jobSnapshot(job) }, { status: 202 });
}
