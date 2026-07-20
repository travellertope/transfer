import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listHistory, addHistory, updateHistory, type TransferRecord } from "@/lib/wordpress";
import { hasLiveJobForHistoryId } from "@/lib/jobs";

// Give a record a little breathing room after creation before treating a
// missing in-memory job as orphaned, purely as a safety margin — in
// practice the job is created in the same request that writes the record.
const RECONCILE_GRACE_MS = 60_000;

/**
 * A history record written as "in_progress" can be left that way forever if
 * the server process running its job dies mid-transfer (jobs live only in
 * memory, so a redeploy kills them outright) before the worker ever gets a
 * chance to flip it to its outcome. Detect and correct those here, on read,
 * rather than leaving the UI showing a transfer that isn't actually running
 * anywhere anymore.
 */
async function reconcileOrphanedTransfers(token: string, transfers: TransferRecord[]): Promise<TransferRecord[]> {
  return Promise.all(
    transfers.map(async (t) => {
      const isStale = Date.now() - new Date(t.created_at).getTime() > RECONCILE_GRACE_MS;
      if (t.status !== "in_progress" || !isStale || hasLiveJobForHistoryId(t.id)) {
        return t;
      }
      try {
        return await updateHistory(token, t.id, {
          status: "failed",
          error: "Transfer was interrupted (e.g. by a server restart) before it could finish.",
        });
      } catch {
        return t; // best-effort — show it as-is if the update fails
      }
    })
  );
}

export async function GET(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const transfers = await reconcileOrphanedTransfers(token, await listHistory(token));
    return NextResponse.json({ transfers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const transfer = await addHistory(token, body);
    return NextResponse.json({ transfer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record transfer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
