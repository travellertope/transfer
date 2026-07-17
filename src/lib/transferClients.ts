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

class FtpTransferClient implements TransferClient {
  private client = new ftp.Client();

  async connect(config: ServerConfig) {
    this.client.ftp.verbose = false;
    await this.client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: false,
    });
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
    await this.client.connect({
      host: config.host,
      port: config.port ?? 22,
      username: config.user,
      password: config.password,
    });
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
