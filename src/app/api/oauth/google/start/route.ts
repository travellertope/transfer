import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSessionUser } from "@/lib/session";
import { buildGoogleAuthUrl, OAUTH_STATE_COOKIE } from "@/lib/googleDrive";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (!user.isPro) {
    return NextResponse.redirect(new URL("/dashboard/servers?gdrive_error=pro_required", req.url));
  }

  let authUrl: string;
  try {
    const state = randomBytes(24).toString("hex");
    const redirectUri = `${req.nextUrl.origin}/api/oauth/google/callback`;
    authUrl = buildGoogleAuthUrl(redirectUri, state);

    const res = NextResponse.redirect(authUrl);
    res.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Google Drive isn't configured.";
    return NextResponse.redirect(
      new URL(`/dashboard/servers?gdrive_error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
