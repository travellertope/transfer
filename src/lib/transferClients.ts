import * as ftp from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import type { Readable, Writable } from "stream";

export type Protocol = "ftp" | "sftp";

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
  downloadTo(destination: Writable, path: string): Promise<void>;
  uploadFrom(source: Readable, path: string): Promise<void>;
  ensureDir(dir: string): Promise<void>;
  close(): void;
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

  async downloadTo(destination: Writable, path: string) {
    await this.client.downloadTo(destination, path);
  }

  async uploadFrom(source: Readable, path: string) {
    await this.client.uploadFrom(source, path);
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

  async downloadTo(destination: Writable, path: string) {
    await this.client.get(path, destination);
  }

  async uploadFrom(source: Readable, path: string) {
    await this.client.put(source, path);
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

export function createTransferClient(protocol: Protocol): TransferClient {
  return protocol === "sftp" ? new SftpTransferClient() : new FtpTransferClient();
}
