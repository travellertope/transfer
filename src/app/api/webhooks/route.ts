import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listWebhooks, createWebhook } from "@/lib/wordpress";

export async function GET(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const webhooks = await listWebhooks(token);
    return NextResponse.json({ webhooks });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const body = await req.json();
    const webhook = await createWebhook(token, body);
    return NextResponse.json({ webhook });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
