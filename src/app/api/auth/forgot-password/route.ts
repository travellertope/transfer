import { NextRequest, NextResponse } from "next/server";
import { forgotPassword } from "@/lib/wordpress";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email is required." },
      { status: 400 }
    );
  }

  const redirectUrl = `${req.nextUrl.origin}/reset-password`;

  try {
    await forgotPassword(email, redirectUrl);
  } catch (err) {
    console.error("AirFTP forgot-password request failed:", err);
  }

  // Always respond success so this endpoint can't be used to enumerate emails.
  return NextResponse.json({ success: true });
}
