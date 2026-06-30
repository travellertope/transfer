import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { updateConnection, deleteConnection } from "@/lib/wordpress";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const connection = await updateConnection(token, id, body);
    return NextResponse.json({ connection });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update server.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteConnection(token, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete server.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
