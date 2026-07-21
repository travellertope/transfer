import { NextRequest, NextResponse } from "next/server";

// Vercel adds x-vercel-ip-country at the edge on every request — no
// geolocation API or extra dependency needed. But if this domain is proxied
// through Cloudflare (orange-cloud DNS) rather than DNS-only, Vercel sees
// Cloudflare's edge IP hit it, not the visitor's — so that header would
// reflect wherever Cloudflare's request came from, not the actual visitor.
// cf-ipcountry is Cloudflare's own geolocation of the original client
// connection, done before any proxying, so it stays correct in that case —
// prefer it when present.
export async function GET(req: NextRequest) {
  const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country");
  return NextResponse.json({ country });
}
