import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";
import { listConnections } from "@/lib/wordpress";
import { refreshOneDriveToken, resolveOneDriveShareLink, getOneDriveDriveId } from "@/lib/oneDrive";

/**
 * Turns a pasted OneDrive/SharePoint share link into the item path AirFTP's
 * path-based OneDrive addressing needs, using the saved connection's own
 * access token. The refresh token never leaves the server.
 */
export async function POST(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const connectionId = body?.connectionId as string | undefined;
  const url = body?.url as string | undefined;
  if (!connectionId || !url) {
    return NextResponse.json({ error: "connectionId and url are required." }, { status: 400 });
  }

  try {
    const connections = await listConnections(token);
    const connection = connections.find((c) => c.id === connectionId && c.protocol === "onedrive");
    if (!connection) {
      return NextResponse.json({ error: "OneDrive connection not found." }, { status: 404 });
    }

    const { accessToken } = await refreshOneDriveToken(connection.password);
    const [resolved, ownDriveId] = await Promise.all([
      resolveOneDriveShareLink(accessToken, url),
      getOneDriveDriveId(accessToken),
    ]);

    if (resolved.driveId && ownDriveId && resolved.driveId !== ownDriveId) {
      return NextResponse.json(
        {
          error:
            "This link points to a file outside this account's own OneDrive (shared by someone else, or in a different site's library) — AirFTP can only transfer files from the connected account's own drive.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ path: resolved.path, name: resolved.name, isFolder: resolved.isFolder });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Couldn't resolve that link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
