const MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me";
// offline_access is required to get a refresh_token back at all — unlike
// Google, Microsoft won't include one just because the flow used response
// type "code".
export const ONEDRIVE_SCOPE = "Files.ReadWrite offline_access User.Read";
export const ONEDRIVE_OAUTH_STATE_COOKIE = "airftp_onedrive_oauth_state";

function clientCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET environment variables are not set.");
  }
  return { clientId, clientSecret };
}

export function buildOneDriveAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: ONEDRIVE_SCOPE,
    state,
  });
  return `${MS_AUTH_URL}?${params.toString()}`;
}

interface MsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/** Microsoft's token-endpoint error bodies are {error, error_description, ...} — error_description carries the actionable AADSTS code/reason as its first line, followed by trace/correlation noise we don't want to surface. */
async function microsoftTokenErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const desc = body?.error_description || body?.error;
    if (!desc) return "";
    return `: ${String(desc).split(/\r?\n/)[0]}`;
  } catch {
    return "";
  }
}

export async function exchangeOneDriveCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: ONEDRIVE_SCOPE,
    }),
  });
  if (!res.ok) {
    const detail = await microsoftTokenErrorDetail(res);
    throw new Error(`Microsoft rejected the authorization code (${res.status})${detail}. Please try connecting again.`);
  }
  const data = (await res.json()) as MsTokenResponse;
  if (!data.refresh_token) {
    throw new Error("Microsoft didn't return a refresh token. Please try connecting again.");
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

export async function refreshOneDriveToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      scope: ONEDRIVE_SCOPE,
    }),
  });
  if (!res.ok) {
    const detail = await microsoftTokenErrorDetail(res);
    throw new Error(
      `OneDrive authorization is invalid or has been revoked${detail} — reconnect your Microsoft account in Saved Servers.`
    );
  }
  const data = (await res.json()) as MsTokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getOneDriveAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch(MS_GRAPH_ME_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error("Couldn't read the connected Microsoft account's email address.");
  }
  const data = await res.json();
  // Personal Microsoft accounts often have a null "mail" — userPrincipalName
  // is always present and is email-shaped for both account types.
  const email = data.mail || data.userPrincipalName;
  if (!email) {
    throw new Error("Microsoft didn't return an email address for this account.");
  }
  return email as string;
}

/** Parses a Graph API error response into a message consistent with isRetryableTransferError's keyword heuristics. */
export async function oneDriveErrorMessage(res: Response): Promise<string> {
  let message = "";
  let code = "";
  try {
    const body = await res.json();
    message = body?.error?.message || "";
    code = body?.error?.code || "";
  } catch {
    /* ignore unparsable error body */
  }

  if (res.status === 429 || code === "activityLimitReached") {
    return `OneDrive rate limit hit, will retry${message ? `: ${message}` : ""}.`;
  }
  if (res.status === 404 || code === "itemNotFound") {
    return `OneDrive file not found${message ? `: ${message}` : ""}. It may have been moved, deleted, or you no longer have access.`;
  }
  if (res.status === 403 || code === "accessDenied") {
    return `OneDrive: permission denied for this file${message ? `: ${message}` : ""}.`;
  }
  if (res.status === 401) {
    return "OneDrive authorization is invalid or has expired — reconnect your Microsoft account in Saved Servers.";
  }
  if (res.status === 507 || code === "quotaLimitReached") {
    return `OneDrive storage quota exceeded${message ? `: ${message}` : ""}.`;
  }
  return `OneDrive request failed (${res.status})${message ? `: ${message}` : ""}.`;
}

/** Graph's documented sharing-URL encoding: base64, then unpadded base64url, prefixed with "u!". */
function encodeSharingUrl(url: string): string {
  const base64 = Buffer.from(url, "utf-8").toString("base64");
  const base64url = base64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  return `u!${base64url}`;
}

export async function getOneDriveDriveId(accessToken: string): Promise<string> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/drive?$select=id", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(await oneDriveErrorMessage(res));
  const data = await res.json();
  return data.id as string;
}

/**
 * Resolves ANY OneDrive/SharePoint share link (short 1drv.ms links, the
 * stream.aspx/onedrive.aspx viewer links OneDrive for Business generates,
 * direct share links — Graph decodes the token itself, so this doesn't need
 * to guess at URL shapes or locale-specific library names) into the item's
 * path relative to its own drive's root, plus which drive it actually lives
 * in — the caller decides whether that matches the connected account.
 */
export async function resolveOneDriveShareLink(
  accessToken: string,
  shareUrl: string
): Promise<{ path: string; name: string; isFolder: boolean; driveId: string }> {
  const encoded = encodeSharingUrl(shareUrl);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem?$select=id,name,parentReference,folder`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) {
      throw new Error("That doesn't look like a valid OneDrive/SharePoint link, or it isn't accessible with this account.");
    }
    throw new Error(await oneDriveErrorMessage(res));
  }
  const data = await res.json();

  // parentReference.path looks like "/drive/root:/Folder/Subfolder" or
  // "/drives/{id}/root:/Folder/Subfolder" — either way, what comes after
  // "root:" is the path relative to that drive's root.
  const parentPath: string = data?.parentReference?.path || "";
  const marker = "root:";
  const markerIndex = parentPath.indexOf(marker);
  const relativeDir = markerIndex === -1 ? "" : parentPath.slice(markerIndex + marker.length);
  const name = (data.name as string) || "";

  return {
    path: `${relativeDir}/${name}`.replace(/\/+/g, "/"),
    name,
    isFolder: !!data.folder,
    driveId: (data?.parentReference?.driveId as string) || "",
  };
}
