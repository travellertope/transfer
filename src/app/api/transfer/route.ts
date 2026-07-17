import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import { getSessionUser } from "@/lib/session";
import { limitForUser, formatBytes } from "@/lib/limits";
import { createTransferClient, type ServerConfig, type TransferClient } from "@/lib/transferClients";

function normalizeConfig(config: ServerConfig): ServerConfig {
  return {
    ...config,
    protocol: config.protocol === "sftp" ? "sftp" : "ftp",
  };
}

export async function POST(req: NextRequest) {
  let sourceClient: TransferClient | null = null;
  let destClient: TransferClient | null = null;

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to start a transfer." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const source = normalizeConfig(body.source);
    const destination = normalizeConfig(body.destination);

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

    // --- Step 1: Connect to source and check the file size against the tier limit ---
    sourceClient = createTransferClient(source.protocol);
    await sourceClient.connect(source);

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

    // --- Step 2: Connect to destination and stream source -> destination concurrently ---
    destClient = createTransferClient(destination.protocol);
    await destClient.connect(destination);

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
