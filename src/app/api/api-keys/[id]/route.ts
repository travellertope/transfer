import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { deleteApiKey } from "@/lib/wordpress";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;
  try {
    await deleteApiKey(token, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
