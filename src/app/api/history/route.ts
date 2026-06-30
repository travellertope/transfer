import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listHistory, addHistory } from "@/lib/wordpress";

export async function GET(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const transfers = await listHistory(token);
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
