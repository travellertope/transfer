import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { exchangeCodeForTokens, getGoogleAccountEmail, OAUTH_STATE_COOKIE } from "@/lib/googleDrive";
import { saveConnection } from "@/lib/wordpress";

export async function GET(req: NextRequest) {
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, req.url));

  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    return redirectTo(`/dashboard/servers?gdrive_error=${encodeURIComponent(error)}`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  const res = !code || !state || !expectedState || state !== expectedState
    ? redirectTo("/dashboard/servers?gdrive_error=Couldn't verify the request. Please try connecting again.")
    : null;
  if (res) {
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  }

  const user = await getSessionUser(req);
  const token = getSessionToken(req);
  if (!user || !token) {
    const loginRedirect = redirectTo("/login");
    loginRedirect.cookies.delete(OAUTH_STATE_COOKIE);
    return loginRedirect;
  }
  if (!user.isPro) {
    const proRedirect = redirectTo("/dashboard/servers?gdrive_error=pro_required");
    proRedirect.cookies.delete(OAUTH_STATE_COOKIE);
    return proRedirect;
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/oauth/google/callback`;
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code as string, redirectUri);
    const email = await getGoogleAccountEmail(accessToken);

    await saveConnection(token, {
      label: `Google Drive (${email})`,
      protocol: "gdrive",
      host: email,
      user: email,
      password: refreshToken,
      path: "root",
    });

    const success = redirectTo("/dashboard/servers?gdrive_connected=1");
    success.cookies.delete(OAUTH_STATE_COOKIE);
    return success;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect Google Drive.";
    const failure = redirectTo(`/dashboard/servers?gdrive_error=${encodeURIComponent(message)}`);
    failure.cookies.delete(OAUTH_STATE_COOKIE);
    return failure;
  }
}
