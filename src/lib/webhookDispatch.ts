import { lookup } from "dns/promises";
import { createHmac } from "crypto";
import type { Webhook } from "./wordpress";

/**
 * Blocks the obvious SSRF cases — a webhook URL pointing at localhost, a
 * private network range, or a cloud metadata endpoint (169.254.169.254).
 * This is not a complete defense: the actual outbound fetch() re-resolves
 * the hostname itself, so a hostname whose DNS answer changes between this
 * check and the real connection (DNS rebinding) would slip through. A fully
 * rebinding-proof implementation would need to pin the connection to the IP
 * verified here instead of letting fetch() re-resolve — not done here.
 */
function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 0) return true; // 0.0.0.0/8
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local, fc00::/7
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.split(":").pop();
    if (mapped) return isPrivateIp(mapped);
  }
  return false;
}

async function isSafeWebhookUrl(urlStr: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  try {
    const addresses = await lookup(url.hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

interface TransferEventPayload {
  id: string;
  source_host: string;
  dest_host: string;
  bytes: number;
  created_at: string;
  error?: string;
}

async function dispatchOne(
  webhook: Webhook,
  event: "transfer.success" | "transfer.failed",
  transfer: TransferEventPayload
): Promise<void> {
  if (!(await isSafeWebhookUrl(webhook.url))) return;

  const body = JSON.stringify({ event, transfer });
  const signature = createHmac("sha256", webhook.secret).update(body).digest("hex");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AirFTP-Event": event,
        "X-AirFTP-Signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
  } catch {
    /* best-effort — a receiver being down or slow shouldn't affect the transfer outcome */
  } finally {
    clearTimeout(timeout);
  }
}

/** Fires the matching active webhooks for an event. Best-effort, never throws. */
export async function dispatchWebhooksForEvent(
  webhooks: Webhook[],
  event: "transfer.success" | "transfer.failed",
  transfer: TransferEventPayload
): Promise<void> {
  const matching = webhooks.filter((w) => w.active && w.events.includes(event));
  await Promise.allSettled(matching.map((w) => dispatchOne(w, event, transfer)));
}
