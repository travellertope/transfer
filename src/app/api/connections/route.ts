import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listConnections, saveConnection } from "@/lib/wordpress";

export async function GET(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const connections = await listConnections(token);
    return NextResponse.json({ connections });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load saved servers.";
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
    const connection = await saveConnection(token, body);
    return NextResponse.json({ connection });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save server.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
