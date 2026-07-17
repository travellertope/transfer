import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getJob, jobSnapshot, requestCancel } from "@/lib/jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }

  return NextResponse.json({ job: jobSnapshot(job) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }

  requestCancel(jobId);
  return NextResponse.json({ success: true });
}
