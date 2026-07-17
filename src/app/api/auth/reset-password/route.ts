import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/wordpress";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { login, key, password } = await req.json();

    if (!login || !key || !password) {
      return NextResponse.json(
        { success: false, error: "Missing reset link details or new password." },
        { status: 400 }
      );
    }

    const { token, user } = await resetPassword(login, key, password);

    const res = NextResponse.json({ success: true, user });
    setSessionCookie(res, token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password reset failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
