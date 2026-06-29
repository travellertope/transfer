import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/wordpress";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { token, user } = await registerUser(email, password);

    const res = NextResponse.json({ success: true, user });
    setSessionCookie(res, token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
