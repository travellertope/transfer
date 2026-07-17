const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const OAUTH_STATE_COOKIE = "airftp_gdrive_oauth_state";

function clientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables are not set.");
  }
  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google rejected the authorization code (${res.status}). Please try connecting again.`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.refresh_token) {
    throw new Error(
      "Google didn't return a refresh token. This can happen if you've already granted access before — " +
        "revoke AirFTP's access at https://myaccount.google.com/permissions and try connecting again."
    );
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(
      "Google Drive authorization is invalid or has been revoked — reconnect your Google account in Saved Servers."
    );
  }
  const data = (await res.json()) as TokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getGoogleAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Couldn't read the connected Google account's email address.");
  }
  const data = await res.json();
  if (!data.email) {
    throw new Error("Google didn't return an email address for this account.");
  }
  return data.email as string;
}

/** Parses a Drive API error response into a message consistent with isRetryableTransferError's keyword heuristics. */
export async function driveErrorMessage(res: Response): Promise<string> {
  let message = "";
  let reasonCode = "";
  try {
    const body = await res.json();
    message = body?.error?.message || "";
    reasonCode = body?.error?.errors?.[0]?.reason || "";
  } catch {
    /* ignore unparsable error body */
  }

  if (res.status === 429 || /rateLimitExceeded|userRateLimitExceeded/i.test(reasonCode)) {
    return `Google Drive rate limit hit, will retry${message ? `: ${message}` : ""}.`;
  }
  if (res.status === 404) {
    return `Google Drive file not found${message ? `: ${message}` : ""}. It may have been moved, deleted, or you no longer have access.`;
  }
  if (res.status === 403) {
    return `Google Drive: permission denied for this file${message ? `: ${message}` : ""}.`;
  }
  if (res.status === 401) {
    return "Google Drive authorization is invalid or has expired — reconnect your Google account in Saved Servers.";
  }
  return `Google Drive request failed (${res.status})${message ? `: ${message}` : ""}.`;
}
