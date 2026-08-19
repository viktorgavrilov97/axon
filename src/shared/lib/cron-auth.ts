import { NextRequest } from "next/server";

/**
 * Validates a cron request. Accepts either:
 *  - `Authorization: Bearer <CRON_SECRET>` (sent automatically by Vercel Cron when CRON_SECRET env is set)
 *  - `?secret=<CRON_SECRET>` query param (legacy / external schedulers)
 *
 * If CRON_SECRET is not configured, requests are rejected — fail closed.
 */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${expected}`) return true;

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret === expected) return true;

  return false;
}
