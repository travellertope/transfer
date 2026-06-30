import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listApiKeys, createApiKey } from "@/lib/wordpress";

export async function GET(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const apiKeys = await listApiKeys(token);
    return NextResponse.json({ apiKeys });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const { label } = await req.json();
    const result = await createApiKey(token, label);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
