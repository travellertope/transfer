import { NextRequest, NextResponse } from "next/server";
import * as ftp from "basic-ftp";
import { PassThrough } from "stream";
import { getSessionUser } from "@/lib/session";
import { limitForUser, formatBytes } from "@/lib/limits";

interface ServerConfig {
  host: string;
  user: string;
  password: string;
  path: string;
}

export async function POST(req: NextRequest) {
  let sourceClient: ftp.Client | null = null;
  let destClient: ftp.Client | null = null;

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to start a transfer." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const source: ServerConfig = body.source;
    const destination: ServerConfig = body.destination;

    // Validate inputs
    if (
      !source?.host ||
      !source?.user ||
      !source?.password ||
      !source?.path
    ) {
      return NextResponse.json(
        { success: false, error: "Missing source server configuration." },
        { status: 400 }
      );
    }
    if (
      !destination?.host ||
      !destination?.user ||
      !destination?.password ||
      !destination?.path
    ) {
      return NextResponse.json(
        { success: false, error: "Missing destination server configuration." },
        { status: 400 }
      );
    }

    // --- Step 1: Connect to source FTP and check the file size against the tier limit ---
    sourceClient = new ftp.Client();
    sourceClient.ftp.verbose = false;
    await sourceClient.access({
      host: source.host,
      user: source.user,
      password: source.password,
      secure: false,
    });

    const fileSize = await sourceClient.size(source.path);
    const limit = limitForUser(user.isPro);
    if (fileSize > limit) {
      sourceClient.close();
      sourceClient = null;
      return NextResponse.json(
        {
          success: false,
          code: "LIMIT_EXCEEDED",
          error: `File is ${formatBytes(fileSize)}, which exceeds your ${
            user.isPro ? "Pro" : "Free"
          } limit of ${formatBytes(limit)}.`,
        },
        { status: 403 }
      );
    }

    // --- Step 2: Connect to destination FTP and stream source -> destination concurrently ---
    destClient = new ftp.Client();
    destClient.ftp.verbose = false;
    await destClient.access({
      host: destination.host,
      user: destination.user,
      password: destination.password,
      secure: false,
    });

    const destDir = destination.path.substring(
      0,
      destination.path.lastIndexOf("/")
    );
    if (destDir) {
      await destClient.ensureDir(destDir);
    }

    const pipe = new PassThrough();
    let totalBytes = 0;
    pipe.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
    });

    await Promise.all([
      sourceClient.downloadTo(pipe, source.path),
      destClient.uploadFrom(pipe, destination.path),
    ]);

    sourceClient.close();
    sourceClient = null;
    destClient.close();
    destClient = null;

    return NextResponse.json({
      success: true,
      message: `Transfer complete. ${formatBytes(totalBytes)} streamed from source to destination.`,
      bytesTransferred: totalBytes,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  } finally {
    if (sourceClient) {
      try {
        sourceClient.close();
      } catch {
        /* ignore cleanup errors */
      }
    }
    if (destClient) {
      try {
        destClient.close();
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
