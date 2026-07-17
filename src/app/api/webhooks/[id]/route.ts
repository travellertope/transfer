import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { updateWebhook, deleteWebhook } from "@/lib/wordpress";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const webhook = await updateWebhook(token, id, body);
    return NextResponse.json({ webhook });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;
  try {
    await deleteWebhook(token, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
