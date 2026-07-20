import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { exchangeOneDriveCode, getOneDriveAccountEmail, ONEDRIVE_OAUTH_STATE_COOKIE } from "@/lib/oneDrive";
import { saveConnection } from "@/lib/wordpress";

export async function GET(req: NextRequest) {
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, req.url));

  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    return redirectTo(`/dashboard/servers?onedrive_error=${encodeURIComponent(error)}`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(ONEDRIVE_OAUTH_STATE_COOKIE)?.value;

  const res = !code || !state || !expectedState || state !== expectedState
    ? redirectTo("/dashboard/servers?onedrive_error=Couldn't verify the request. Please try connecting again.")
    : null;
  if (res) {
    res.cookies.delete(ONEDRIVE_OAUTH_STATE_COOKIE);
    return res;
  }

  const user = await getSessionUser(req);
  const token = getSessionToken(req);
  if (!user || !token) {
    const loginRedirect = redirectTo("/login");
    loginRedirect.cookies.delete(ONEDRIVE_OAUTH_STATE_COOKIE);
    return loginRedirect;
  }
  if (!user.isPro) {
    const proRedirect = redirectTo("/dashboard/servers?onedrive_error=pro_required");
    proRedirect.cookies.delete(ONEDRIVE_OAUTH_STATE_COOKIE);
    return proRedirect;
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/oauth/onedrive/callback`;
    const { accessToken, refreshToken } = await exchangeOneDriveCode(code as string, redirectUri);
    const email = await getOneDriveAccountEmail(accessToken);

    await saveConnection(token, {
      label: `OneDrive (${email})`,
      protocol: "onedrive",
      host: email,
      user: email,
      password: refreshToken,
      // Unlike Drive/YouTube, OneDrive has real paths — this is just a
      // starting point the user edits per-transfer, same as an FTP path.
      path: "/",
    });

    const success = redirectTo("/dashboard/servers?onedrive_connected=1");
    success.cookies.delete(ONEDRIVE_OAUTH_STATE_COOKIE);
    return success;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect OneDrive.";
    const failure = redirectTo(`/dashboard/servers?onedrive_error=${encodeURIComponent(message)}`);
    failure.cookies.delete(ONEDRIVE_OAUTH_STATE_COOKIE);
    return failure;
  }
}
