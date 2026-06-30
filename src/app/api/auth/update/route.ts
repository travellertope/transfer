import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { updateUser } from "@/lib/wordpress";

export async function PUT(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const user = await updateUser(token, body);
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
