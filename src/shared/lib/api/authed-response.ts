import { NextResponse } from "next/server";

/**
 * JSON response helper for authenticated, per-user endpoints.
 *
 * Forces `Cache-Control: private, no-store` and `Pragma: no-cache` so that
 * Edge / browser / shared caches never serve one user's data to another.
 *
 * Use this anywhere a route handler returns data scoped to the current user
 * (balance, metrics, referral stats, operations, profile, ...).
 *
 * Cache headers from the caller's `init` are intentionally overwritten —
 * this is the whole point.
 */
export function authedJson<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return NextResponse.json(data, { ...init, headers });
}
