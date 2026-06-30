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
  role: "source" | "destination";
  host: string;
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

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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
  status: "success" | "failed";
  error: string;
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
  };
  const res = await fetch(wpUrl("/history"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseOrThrow<{ transfer: TransferRecord }>(res);
  return data.transfer;
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
