import { NextRequest, NextResponse } from "next/server";
import { validateToken, WpUser } from "./wordpress";

export const SESSION_COOKIE = "airftp_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches the JWT TTL in the WP plugin

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.delete(SESSION_COOKIE);
}

export function getSessionToken(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(req: NextRequest): Promise<WpUser | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  return validateToken(token);
}
