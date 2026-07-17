import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listConnections } from "@/lib/wordpress";
import { refreshAccessToken } from "@/lib/googleDrive";

/**
 * Short-lived Drive access token for a saved Google Drive connection, for
 * client-side use by the Google Picker widget only. The refresh token never
 * leaves the server.
 */
export async function GET(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required." }, { status: 400 });
  }

  try {
    const connections = await listConnections(token);
    const connection = connections.find((c) => c.id === connectionId && c.protocol === "gdrive");
    if (!connection) {
      return NextResponse.json({ error: "Google Drive connection not found." }, { status: 404 });
    }

    const { accessToken, expiresIn } = await refreshAccessToken(connection.password);
    return NextResponse.json({ accessToken, expiresIn });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get a Google Drive access token.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
