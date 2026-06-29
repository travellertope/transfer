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

export async function deleteConnection(token: string, id: string): Promise<void> {
  const res = await fetch(wpUrl(`/connections/${id}`), {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseOrThrow(res);
}
