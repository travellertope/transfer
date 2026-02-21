import { NextRequest, NextResponse } from "next/server";
import * as ftp from "basic-ftp";
import { Writable, Readable } from "stream";

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

    // --- Step 1: Connect to source FTP and download into a buffer stream ---
    sourceClient = new ftp.Client();
    sourceClient.ftp.verbose = false;
    await sourceClient.access({
      host: source.host,
      user: source.user,
      password: source.password,
      secure: false,
    });

    // Collect data from source into chunks
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    const writableCollector = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(chunk);
        totalBytes += chunk.length;
        callback();
      },
    });

    await sourceClient.downloadTo(writableCollector, source.path);
    sourceClient.close();
    sourceClient = null;

    // --- Step 2: Connect to destination FTP and upload from collected data ---
    destClient = new ftp.Client();
    destClient.ftp.verbose = false;
    await destClient.access({
      host: destination.host,
      user: destination.user,
      password: destination.password,
      secure: false,
    });

    // Ensure the destination directory exists
    const destDir = destination.path.substring(
      0,
      destination.path.lastIndexOf("/")
    );
    if (destDir) {
      await destClient.ensureDir(destDir);
    }

    // Create a readable stream from collected chunks
    const readableUpload = new Readable({
      read() {
        for (const chunk of chunks) {
          this.push(chunk);
        }
        this.push(null);
      },
    });

    await destClient.uploadFrom(readableUpload, destination.path);
    destClient.close();
    destClient = null;

    const gbTransferred = (totalBytes / 1073741824).toFixed(2);

    return NextResponse.json({
      success: true,
      message: `Transfer complete. ${gbTransferred} GB streamed from source to destination.`,
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
