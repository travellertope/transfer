import type { Protocol, ServerConfig } from "./transferClients";

export interface WpUser {
  id: number;
  email: string;
  name: string;
  isPro: boolean;
}

interface WpAuthResponse {
  token: string;
  user: WpUser;
}

export interface SavedConnection {
  id: string;
  label: string;
  protocol: Protocol;
  host: string;
  port?: number;
  user: string;
  password: string;
  path: string;
}

function wpUrl(path: string) {
  const base = process.env.WORDPRESS_URL;
  if (!base) {
    throw new Error("WORDPRESS_URL environment variable is not set.");
  }
  return `${base.replace(/\/$/, "")}/wp-json/airftp/v1${path}`;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Request to WordPress failed.");
  }
  return data as T;
}

export async function registerUser(
  email: string,
  password: string
): Promise<WpAuthResponse> {
  const res = await fetch(wpUrl("/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow<WpAuthResponse>(res);
}

export async function loginUser(
  email: string,
  password: string
): Promise<WpAuthResponse> {
  const res = await fetch(wpUrl("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow<WpAuthResponse>(res);
}

export async function forgotPassword(email: string, redirectUrl: string): Promise<void> {
  const res = await fetch(wpUrl("/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectUrl }),
  });
  await parseOrThrow(res);
}

export async function resetPassword(
  login: string,
  key: string,
  password: string
): Promise<WpAuthResponse> {
  const res = await fetch(wpUrl("/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, key, password }),
  });
  return parseOrThrow<WpAuthResponse>(res);
}

export async function validateToken(token: string): Promise<WpUser | null> {
  try {
    const res = await fetch(wpUrl("/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as WpUser;
  } catch {
    return null;
  }
}

// Sent as a custom header rather than "Authorization: Bearer ..." — some WP
// hosts run a security/JWT plugin that inspects any standard Authorization
// header on every REST request and rejects ours before our own plugin ever
// sees it. See airftp_extract_token() in the WP plugin's jwt.php.
function authHeaders(token: string) {
  return { "Content-Type": "application/json", "X-AirFTP-Token": token };
}

export async function listConnections(token: string): Promise<SavedConnection[]> {
  const res = await fetch(wpUrl("/connections"), { headers: authHeaders(token) });
  const data = await parseOrThrow<{ connections: SavedConnection[] }>(res);
  return data.connections;
}

export async function saveConnection(
  token: string,
  conn: Omit<SavedConnection, "id">
): Promise<SavedConnection> {
  const res = await fetch(wpUrl("/connections"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(conn),
  });
  const data = await parseOrThrow<{ connection: SavedConnection }>(res);
  return data.connection;
}

export async function updateConnection(
  token: string,
  id: string,
  conn: Partial<Omit<SavedConnection, "id">>
): Promise<SavedConnection> {
  const res = await fetch(wpUrl(`/connections/${id}`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(conn),
  });
  const data = await parseOrThrow<{ connection: SavedConnection }>(res);
  return data.connection;
}

export async function deleteConnection(token: string, id: string): Promise<void> {
  const res = await fetch(wpUrl(`/connections/${id}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseOrThrow(res);
}

export interface TransferRecord {
  id: string;
  created_at: string;
  source_host: string;
  source_path: string;
  dest_host: string;
  dest_path: string;
  bytes: number;
  status: "in_progress" | "success" | "failed";
  error: string;
  // Full connection details for one-click retry. Only present on transfers
  // recorded after retry support shipped; older entries have these as null.
  source: ServerConfig | null;
  destination: ServerConfig | null;
}

export async function listHistory(token: string): Promise<TransferRecord[]> {
  const res = await fetch(wpUrl("/history"), { headers: authHeaders(token) });
  const data = await parseOrThrow<{ transfers: TransferRecord[] }>(res);
  return data.transfers;
}

export async function addHistory(
  token: string,
  record: Omit<TransferRecord, "id" | "created_at">
): Promise<TransferRecord> {
  const body = {
    sourceHost: record.source_host,
    sourcePath: record.source_path,
    destHost: record.dest_host,
    destPath: record.dest_path,
    bytes: record.bytes,
    status: record.status,
    error: record.error ?? "",
    source: record.source,
    destination: record.destination,
  };
  const res = await fetch(wpUrl("/history"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseOrThrow<{ transfer: TransferRecord }>(res);
  return data.transfer;
}

export async function updateHistory(
  token: string,
  id: string,
  patch: Partial<Pick<TransferRecord, "status" | "bytes" | "error">>
): Promise<TransferRecord> {
  const res = await fetch(wpUrl(`/history/${id}`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  const data = await parseOrThrow<{ transfer: TransferRecord }>(res);
  return data.transfer;
}

export async function notifyTransferComplete(
  token: string,
  event: "transfer.success" | "transfer.failed",
  details: { sourceHost: string; destHost: string; bytes: number; error: string; historyUrl: string }
): Promise<void> {
  const res = await fetch(wpUrl("/notify"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      event,
      sourceHost: details.sourceHost,
      destHost: details.destHost,
      bytes: details.bytes,
      error: details.error,
      historyUrl: details.historyUrl,
    }),
  });
  await parseOrThrow(res);
}

export async function updateUser(
  token: string,
  fields: { name?: string; email?: string; currentPassword?: string; newPassword?: string }
): Promise<WpUser> {
  const res = await fetch(wpUrl("/user"), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(fields),
  });
  const data = await parseOrThrow<{ user: WpUser }>(res);
  return data.user;
}

export interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  created_at: string;
}

export async function listApiKeys(token: string): Promise<ApiKey[]> {
  const res = await fetch(wpUrl("/api-keys"), { headers: authHeaders(token) });
  const data = await parseOrThrow<{ apiKeys: ApiKey[] }>(res);
  return data.apiKeys;
}

export async function createApiKey(
  token: string,
  label: string
): Promise<{ apiKey: ApiKey; fullKey: string }> {
  const res = await fetch(wpUrl("/api-keys"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ label }),
  });
  return parseOrThrow<{ apiKey: ApiKey; fullKey: string }>(res);
}

export async function deleteApiKey(token: string, id: string): Promise<void> {
  const res = await fetch(wpUrl(`/api-keys/${id}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseOrThrow(res);
}

export interface Webhook {
  id: string;
  label: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  /** Used to sign the X-AirFTP-Signature header on delivered payloads (HMAC-SHA256), so the receiver can verify authenticity. */
  secret: string;
}

export async function listWebhooks(token: string): Promise<Webhook[]> {
  const res = await fetch(wpUrl("/webhooks"), { headers: authHeaders(token) });
  const data = await parseOrThrow<{ webhooks: Webhook[] }>(res);
  return data.webhooks;
}

export async function createWebhook(
  token: string,
  hook: Omit<Webhook, "id" | "created_at">
): Promise<Webhook> {
  const res = await fetch(wpUrl("/webhooks"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(hook),
  });
  const data = await parseOrThrow<{ webhook: Webhook }>(res);
  return data.webhook;
}

export async function updateWebhook(
  token: string,
  id: string,
  hook: Omit<Webhook, "id" | "created_at">
): Promise<Webhook> {
  const res = await fetch(wpUrl(`/webhooks/${id}`), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(hook),
  });
  const data = await parseOrThrow<{ webhook: Webhook }>(res);
  return data.webhook;
}

export async function deleteWebhook(token: string, id: string): Promise<void> {
  const res = await fetch(wpUrl(`/webhooks/${id}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseOrThrow(res);
}

export async function setUserPro(email: string, isPro: boolean): Promise<WpUser> {
  const adminSecret = process.env.WORDPRESS_ADMIN_SECRET;
  if (!adminSecret) {
    throw new Error("WORDPRESS_ADMIN_SECRET environment variable is not set.");
  }

  const res = await fetch(wpUrl("/set-pro"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AirFTP-Admin-Secret": adminSecret,
    },
    body: JSON.stringify({ email, isPro }),
  });
  const data = await parseOrThrow<{ user: WpUser }>(res);
  return data.user;
}
