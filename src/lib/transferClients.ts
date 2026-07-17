import * as ftp from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { Writable } from "stream";
import { driveErrorMessage, refreshAccessToken } from "./googleDrive";

export type Protocol = "ftp" | "sftp" | "gdrive";

export interface ServerConfig {
  protocol: Protocol;
  host: string;
  port?: number;
  user: string;
  password: string;
  path: string;
}

export interface TransferClient {
  connect(config: ServerConfig): Promise<void>;
  size(path: string): Promise<number>;
  /** The file's display name — trivial (basename) for ftp/sftp, a real lookup for gdrive. */
  fileName(path: string): Promise<string>;
  /** startAt resumes a partial download from a byte offset (0 = from the start). */
  downloadTo(destination: Writable, path: string, startAt?: number): Promise<void>;
  /** append writes onto an existing remote file instead of replacing it, for resuming an interrupted upload. */
  uploadFrom(source: Readable, path: string, append?: boolean): Promise<void>;
  ensureDir(dir: string): Promise<void>;
  close(): void;
}

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "file";
}

/** True for errors that look transient (network blips) and are worth retrying, as opposed to permanent ones (bad creds, missing file). */
export function isRetryableTransferError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  if (/rejected the username\/password|refused the connection|resolve the hostname|exceeds your|invalid|not found|no such file|permission denied/i.test(message)) {
    return false;
  }
  return true;
}

/** Turns low-level connection errors into messages that point at the likely fix. */
function describeConnectError(
  protocol: Protocol,
  host: string,
  port: number,
  err: unknown
): Error {
  const raw = err instanceof Error ? err.message : String(err);
  const where = `${protocol.toUpperCase()} server ${host}:${port}`;
  const code = (err as { code?: string } | undefined)?.code;

  if (/timed out while waiting for handshake/i.test(raw)) {
    return new Error(
      `Couldn't reach ${where} — it accepted the connection but never responded with an SSH handshake within the timeout. ` +
        `This usually means the host doesn't actually run SFTP/SSH on that port (many shared-hosting FTP endpoints are FTP-only), ` +
        `or a firewall is silently dropping the traffic. Double-check the port, or try FTP instead if this server doesn't offer SFTP.`
    );
  }
  if (code === "ECONNREFUSED") {
    return new Error(
      `${where} refused the connection — nothing is listening on that port. Check that you have the right protocol and port for this server.`
    );
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return new Error(
      `Couldn't resolve the hostname for ${where} — check that the host is spelled correctly and is publicly reachable.`
    );
  }
  if (code === "ETIMEDOUT") {
    return new Error(
      `Connection to ${where} timed out — the host may be unreachable from our servers, or a firewall may be blocking the connection.`
    );
  }
  if (/all configured authentication methods failed/i.test(raw) || /login|auth/i.test(raw)) {
    return new Error(`${where} rejected the username/password. Double-check the credentials.`);
  }

  return new Error(`Couldn't connect to ${where}: ${raw}`);
}

class FtpTransferClient implements TransferClient {
  private client = new ftp.Client();

  async connect(config: ServerConfig) {
    this.client.ftp.verbose = false;
    try {
      await this.client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: false,
      });
    } catch (err) {
      throw describeConnectError("ftp", config.host, config.port ?? 21, err);
    }
  }

  size(path: string) {
    return this.client.size(path);
  }

  async fileName(path: string) {
    return basename(path);
  }

  async downloadTo(destination: Writable, path: string, startAt = 0) {
    await this.client.downloadTo(destination, path, startAt);
  }

  async uploadFrom(source: Readable, path: string, append = false) {
    if (append) {
      await this.client.appendFrom(source, path);
    } else {
      await this.client.uploadFrom(source, path);
    }
  }

  async ensureDir(dir: string) {
    if (dir) await this.client.ensureDir(dir);
  }

  close() {
    this.client.close();
  }
}

class SftpTransferClient implements TransferClient {
  private client = new SftpClient();

  async connect(config: ServerConfig) {
    try {
      await this.client.connect({
        host: config.host,
        port: config.port ?? 22,
        username: config.user,
        password: config.password,
      });
    } catch (err) {
      throw describeConnectError("sftp", config.host, config.port ?? 22, err);
    }
  }

  async size(path: string) {
    const stat = await this.client.stat(path);
    return stat.size;
  }

  async fileName(path: string) {
    return basename(path);
  }

  async downloadTo(destination: Writable, path: string, startAt = 0) {
    // @types/ssh2-sftp-client's ReadStreamOptions omits `start`, even though
    // ssh2-sftp-client forwards it verbatim to ssh2's createReadStream,
    // which does support it — hence the cast.
    const options =
      startAt > 0
        ? ({ readStreamOptions: { start: startAt } } as SftpClient.TransferOptions)
        : undefined;
    await this.client.get(path, destination, options);
  }

  async uploadFrom(source: Readable, path: string, append = false) {
    await this.client.put(source, path, append ? { writeStreamOptions: { flags: "a" } } : undefined);
  }

  async ensureDir(dir: string) {
    if (dir) await this.client.mkdir(dir, true);
  }

  close() {
    this.client.end().catch(() => {
      /* ignore cleanup errors */
    });
  }
}

/**
 * Google Drive as a transfer endpoint. Unlike FTP/SFTP there's no real path —
 * `path` here is a Drive file ID when used as a source, and
 * "<folderId>/<fileName>" (joined by the worker, since Drive needs both a
 * parent folder and a name to create a file) when used as a destination.
 * `config.password` carries the account's OAuth refresh token (encrypted at
 * rest the same way an FTP password is); `config.host`/`config.user` just
 * hold the connected account's email for display.
 */
class GoogleDriveTransferClient implements TransferClient {
  private refreshToken = "";
  private accessToken = "";
  private accessTokenExpiry = 0;

  async connect(config: ServerConfig) {
    this.refreshToken = config.password;
    if (!this.refreshToken) {
      throw new Error(
        "This Google Drive connection is missing its authorization — reconnect your Google account in Saved Servers."
      );
    }
    await this.ensureAccessToken();
  }

  private async ensureAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiry - 60_000) {
      return;
    }
    const { accessToken, expiresIn } = await refreshAccessToken(this.refreshToken);
    this.accessToken = accessToken;
    this.accessTokenExpiry = Date.now() + expiresIn * 1000;
  }

  async size(fileId: string) {
    await this.ensureAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=size,mimeType,name`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    if (!res.ok) throw new Error(await driveErrorMessage(res));
    const data = await res.json();
    if (data.mimeType === "application/vnd.google-apps.folder") {
      throw new Error("That's a Google Drive folder, not a file — pick a file to transfer.");
    }
    if (data.size === undefined) {
      throw new Error(
        `"${data.name}" doesn't have a transferable file size — Google Docs/Sheets/Slides files can't be transferred directly. Export it to a file first.`
      );
    }
    return Number(data.size);
  }

  async fileName(fileId: string) {
    await this.ensureAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    if (!res.ok) throw new Error(await driveErrorMessage(res));
    const data = await res.json();
    return (data.name as string) || "file";
  }

  async downloadTo(destination: Writable, fileId: string, startAt = 0) {
    await this.ensureAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(startAt > 0 ? { Range: `bytes=${startAt}-` } : {}),
        },
      }
    );
    if (!res.ok && res.status !== 206) {
      throw new Error(await driveErrorMessage(res));
    }
    if (!res.body) {
      throw new Error("Google Drive returned an empty response body.");
    }
    await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), destination);
  }

  /** path is "<folderId>/<fileName>" — split on the first "/" since folder IDs never contain one. */
  async uploadFrom(source: Readable, path: string) {
    await this.ensureAccessToken();
    const sepIndex = path.indexOf("/");
    const folderId = sepIndex === -1 ? path : path.slice(0, sepIndex);
    const fileName = sepIndex === -1 ? "file" : path.slice(sepIndex + 1) || "file";

    const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ name: fileName, parents: [folderId] }),
    });
    if (!initRes.ok) {
      throw new Error(await driveErrorMessage(initRes));
    }
    const sessionUrl = initRes.headers.get("location");
    if (!sessionUrl) {
      throw new Error("Google Drive didn't return an upload session URL.");
    }

    const uploadRes = await fetch(sessionUrl, {
      method: "PUT",
      body: Readable.toWeb(source) as unknown as BodyInit,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    if (!uploadRes.ok) {
      throw new Error(await driveErrorMessage(uploadRes));
    }
  }

  async ensureDir() {
    /* no-op: the destination folder is chosen via the Google Picker and already exists */
  }

  close() {
    /* stateless REST calls — nothing to close */
  }
}

export function createTransferClient(protocol: Protocol): TransferClient {
  if (protocol === "sftp") return new SftpTransferClient();
  if (protocol === "gdrive") return new GoogleDriveTransferClient();
  return new FtpTransferClient();
}
